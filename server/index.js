console.log("Starting Messaging Demo")
require('dotenv').config();
const express = require('express');
const app = express();
const server = require('http').createServer();
const qs = require('qs');
const port = process.env.PORT || 3001;
const callback_url =process.env.SUBSCRIBED_CALLBACK_URL
const moengage_callback = process.env.MOENGAGE_CALLBACK_URL
var morgan = require('morgan')
var timeout = require('connect-timeout')
const {addTask} = require('../controllers/taskQueue')
const jwt = require('jsonwebtoken');
const {getAuthToken, getRefreshToken, get_templates, get_wa_id, store_auth_token, store_refresh_token, store_templates, store_message, store_wa_id, get_whitelist, get_message_by_conv_id, get_message_by_wa_message_id} = require('../datastore');
const { postFormData, axios_error_logger, axiosInstance, updateStatusToMoEngage } = require('../utils/api');
const cors = require('cors');

// The kind for the new entity
const kind = process.env.DT_KIND;

var whatsapp_id = null


app.use(timeout(process.env.RESPONSE_TIMEOUT || "30s"))
app.use(morgan('combined'))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(require('../router'));

//token that Authenticates Moengage
const _token = process.env.MOENGAGE_AUTH_AGAINST
const findKeyValue = (obj, key, val) =>
  Object.keys(obj).filter(k => obj[key] === val && k ===key );



moengage_auth = function(req, res, next) {
  console.log("call moengage_auth post", JSON.stringify(req.body))
  
  if (!req.headers.authorization) {
    mes = {
      "status": "failure",
      "error" : {
      "code" : "7000",
      "message" : "Invalid credentials"
      }
    }
    return res.json(mes);
  }else{
    const token = req.headers.authorization.split(' ')[1];
    if(token!= _token){
      mes = {
        "status": "failure",
        "error" : {
        "code" : "7000",
        "message" : "Invalid credentials"
        }
      }
      return res.json(mes);     
    }
  }
  next();
}

app.get('/', (req, res) => {
  res.json(200);
});

// app.post("/generateToken", (req, res) => {
//   try {
//     const { userId, token } = req.body; 
//     let data = {
//         time: Date(),
//         userId: userId,
//     } 
//     const generatedToken = jwt.sign(data, token);
//     res.status(200).send({token: generatedToken});
//   } catch (error) {
//     res.status(500).send({ error: JSON.stringify(error) });
//   }
// });

app.get('/refresh_token', async (req, res) => {
  // code to white list url
  // if url is not white listed then return


  let isSuccess = true;
  try {
    const response = await  refresh_jumper_tokens();
    if(!response) {
     isSuccess = false
     console.error('failed refresh token:', response);
    }else{}
  } catch (e) {
    console.error(e);
    isSuccess = false
  }
  res.json(req.query,  isSuccess ? 200 : 500);
});

app.post('/moengage_callback', async (req, res) => {
  console.log("moengage post",req.body)
  res.send(200)
})

app.get('/list_jumper_templates', async (req, res) => {
  console.log("moengage post",req.body)
  var _templates = await jumper_fetch_templates()
  res.json(_templates)
})

function getStatus(req) {
  try {
    const { data, subscription_type, type } = req.body.event;
    console.log('data', JSON.stringify(data))
    let status = '', wa_message_id = '';
    if (type == 'UPDATE' && subscription_type == 'livechat') {

      // code to extract rejected status
      status = data?.status;
      if (status) {
        wa_message_id = data?.message_uuid;
        if (status == 'rejected' || status == 'reject') {
          status = "failed"
        }
        return {status, wa_message_id};
      }

      // code to extract sent and delivered status
      status = data?.entry[0]?.changes[0]?.value?.statuses[0]?.status;
      if (status) {
        wa_message_id = data?.entry[0]?.changes[0]?.value?.statuses[0]?.id;
        return {status, wa_message_id};
      }
      
    } else {
      return {}
    }

  } catch (error) {
    console.error('error:', JSON.stringify(error));
    return {}
  }
}

app.post('/jumper_callback', async (req, res) => {
  console.log('callback init', JSON.stringify(req.body))
  const {status, wa_message_id} = getStatus(req);
  console.log('status:', JSON.stringify({ status, wa_message_id }));

  if(status && wa_message_id) {
    const response = await updateStatusToMoEngage(status, wa_message_id)
    const responseData = response?.data;
    console.log('updateStatusToMoEngage response ', JSON.stringify(responseData));
    if (responseData.status == "success") {
      console.log(`${wa_message_id} successfully status updated as ${status}`)
      return res.json({"status":"success","message":`MoEngage status updated as "${status}" for message id: ${wa_message_id}`})
    }
  }
  console.error(`${wa_message_id} error in status update, status: ${status}, wa_message_id: ${wa_message_id}`);
  return res.json({ "status": "error", "message": "failed sending  callback to moengage" })
});

app.post('/jumper_callback_2', async (req, res) => {
  // sent
  // submitted
  // delivered
  // replied*
  // rejected
  // failed
  // read
  // reply from agent*
  
  console.log("post Callback: ")
  // console.log(JSON.stringify(req.body))
  let payload = req.body.event
  console.log( JSON.stringify(payload) )
  if(payload.subscription_type=="livechat"){
    if(!payload.data.agent){ //means it's from the user
      reply_message = await create_moengage_reply(payload.data.messageid, payload.data.conversationid,payload.data.message,payload.data.mobilecountrycode+payload.data.mobile, payload.data.replytomessage)
      let data = JSON.stringify(reply_message);
      console.log("Data to be sent:", data)
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: moengage_callback,
        headers: { 
          'Content-Type': 'application/json'
        },
        data : data
      };
      try {
        console.log('call back to moengage livechat', JSON.stringify(config))
        const response = await axiosInstance.request(config);
        console.log(response.data)
        if (response.data.success == true){
          return res.json({"status":"success","message":response.data})
        }
        else return res.json({"status":"error","message":"failed sending  callback to moengage"})
      } catch (error) {
        axios_error_logger(moengage_callback, error)
        return res.json({"status":"error","message":"failed sending callback to moengage"})
      }
    }else if(payload.data.delivered == true){
      reply_message = await create_moengage_dlr(payload.data.messageid, "delivered")
      let data = JSON.stringify(reply_message);
      console.log("Data to be sent:", data)
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: moengage_callback,
        headers: { 
          'Content-Type': 'application/json'
        },
        data : data
      };
      try {
        console.log('call back to moengage delivered', JSON.stringify(config))
        const response = await axiosInstance.request(config);
        console.log(response.data)
        if (response.data.success == true){
          return res.json({"status":"success","message":response.data})
        }
        else return res.json({"status":"error","message":"failed sending  callback to moengage"})
      } catch (error) {
        axios_error_logger(moengage_callback, error)
        return res.json({"status":"error","message":"failed sending callback to moengage"})
      }
    }
  }
  
  return res.json(200);
});


async function create_moengage_reply(message_id, conv_id, message, to, replytomessage = null){
  var waba_number
  var moengage_msg_id
  var template_id
  var tid = null
  if (replytomessage){
    tid = replytomessage.message.split("_")[1]
    const messageDetails = await get_message_by_conv_id(replytomessage.conversationid);
    console.log('conversationid:' + replytomessage.conversationid);
    console.log(JSON.stringify(messageDetails));
    waba_number = messageDetails.mo_waba_number;
    moengage_msg_id = messageDetails.mo_msg_id;
    template_id = messageDetails.mo_template_id;
    // waba_number = await dt_get("conv_id_waba_"+replytomessage.conversationid)
    // moengage_msg_id = await dt_get("conv_id_moengage_msg_id_"+replytomessage.conversationid)
    // template_id = await dt_get("conv_id_moengage_template_id_"+replytomessage.conversationid)
  }
  
  console.log("Template ID:",template_id)
  console.log("TID:",tid)
  


  payload = {
    "from": to,
    "waba_number": waba_number,
    "timestamp": Date.now(),
    "type": "text",
    "context": {
      "msg_id": moengage_msg_id
    }
  }

  if(template_id == tid){
    console.log("Reply to message detected: Treating as button with text")
    payload["button"] = {"payload":{"nothing":0},"text":message}
    payload["type"] = "button"
  }
  return payload
}

async function create_moengage_dlr(message_id, status){
  // var moengage_msg_id = await dt_get("message_id_" + message_id);
  console.log('message id', message_id);
  const message = await get_message_by_wa_message_id({ wa_message_id: message_id })
  console.log( "delivered message", JSON.stringify(message));
  const moengage_msg_id = message.mo_msg_id
  return {
    "statuses": [
        {
        "msg_id": moengage_msg_id,
        "status": status,
        "timestamp": Date.now()
        }
      ]
    }
}

app.post('/send_whatsapp', moengage_auth, async (req, res) => {
  const project = process.env.DT_PROJECT_ID;
  const queue = process.env.QUEUE_NAME;
  const location = process.env.QUEUE_LOCATION;
  const payload = JSON.stringify(req.body);

  try {
    await addTask(project, queue, location, payload);
    res.status(200).send({status: "success"});
  } catch (error) {
    console.error(error);
    res.status(500).send({message: error});
  }
})

app.post('/chat/send-message', moengage_auth, async (req, res) => {

  try {
    console.log("post Whatsapp: ", JSON.stringify(req.body));
    let campaign_id = req.query.campaign_id, data = req.body, found = false;

    let templates = await get_templates(); // get templates cached in store
    let foundTemplate = templates?.find(t => t.template_name == data.template.name)
    // let foundTemplate = templates[0];
    console.log('found template', JSON.stringify(foundTemplate));

    if (!templates?.length || !foundTemplate) {
      console.log('fetch templates');
      templates = await jumper_fetch_templates();
      await store_templates({ templates })
      foundTemplate = templates.find(t => t.template_name == data.template.name)
    }


    //if we find it, let's look if the language is supported by the template
    if(foundTemplate){
      await foundTemplate.templates.forEach(async (template_language) => {
        const foundLanguage = findKeyValue(template_language, "language", data.template?.language?.code)

        //if we find the language, let's send the message
        if(foundLanguage.length>0){
          found = true;
          let components = null;
          if(data.template.components) components = data.template.components

          const dat = await sendWhatsappMessage(template_language.id, data.to, data.msg_id, data.from, components, campaign_id);
          return res.json(dat).end
        }
      })
    }

    if(!found){
      mes = {
        "status": "failure",
        "error" : {
        "code" : "01",
        "message" : "TEMPLATE NOT FOUND"
        }
      }
      console.log("error:", JSON.stringify(mes));
      return res.status(500).send(mes);
    }
  } catch (error) {
    console.log("error:", JSON.stringify(error));
    mes = {
      "status": "failure",
      "error" : {
        "code" : "01",
        "message" : error
      }
    }
    return res.status(500).send(mes);
  }
  
});


//send whatsapp message with template
async function sendWhatsappMessage(template_id, number, msg_id, waba_number,_components, campaign_id){
  var components = {'HEADER':[],'BODY':[],'BUTTONS':[]}
  if(_components){
    for(comp of _components){
      if(comp.type=="header"){
        var p = new Array()
        for(params of comp.parameters){
          h = {}
          link = params["image"]["link"]
          h[link] = "image"
          components.HEADER.push(h)
        }        
      }
      if(comp.type=="body"){
        var p = new Array()
        for(params of comp.parameters){
          h = {}
          if(params.type=="text"){
            text = params.text
            h[text] = "text"
            components.BODY.push(h)
          }      
        }
      }
      if(comp.type=="button"){
        // var p = new Array()
        //   for (var i = 0; i < comp.parameters.length; i++) {
        //     console.dir(comp.parameters[i], {depth:9})
        //     if(comp.parameters[i]["type"] == "payload"){
        //       comp.parameters[i]["type"] = "text"
        //       comp.parameters[i]["text"] = comp.parameters[i]["payload"]
        //       delete comp.parameters[i]["payload"]
        //       console.dir(comp.parameters[i], {depth:9})
        //     }
        //   }
        
        comp.index = Number(comp.index)
        
        components.BUTTONS.push(comp)
      }
    }
  }

  console.log(`msg_id:${msg_id} Generated Components`, JSON.stringify(components))

  const body = {
      to: number,
      channel: 'whatsapp',
      message: `s3ndt3mpl4te_${template_id}`,
      messagetype: 'template',
    // message_params:  JSON.stringify( {'HEADER':[],'BODY':[{'1':'text'}],'BUTTONS':[{'type':'button','sub_type':'url','index':0,'parameters':[{'type':'text','text':'/order/1234'}]}]}),
      message_params: JSON.stringify(components)
    };

  try {
    const responsePromise = await postFormData('https://api.jumper.ai/chat/send-message', body);
    // const response = await axiosInstance.request(config);
    const response = await responsePromise.json();
    console.log(`msg_id:${msg_id} message send response:`, JSON.stringify(response))
    if (response.success == true){
      // await dt_store("message_id_"+response.data.message_id, msg_id, {EX: 604800})
      // await dt_store("conv_id_waba_"+response.data.conversationid, waba_number, {EX: 604800})
      // await dt_store("conv_id_moengage_msg_id_"+response.data.conversationid, msg_id, {EX: 604800})
      // await dt_store("conv_id_moengage_template_id_" + response.data.conversationid, template_id, { EX: 604800 })

      const message = {
        mo_msg_id: msg_id,
        mo_waba_number: waba_number,
        mo_template_id: template_id,
        wa_message_id: response.message_id,
        wa_conv_id: response.conversationid,
        campaign_id: campaign_id || ''
      }

      await store_message(message)
      return {"status":"success","message":response}
    }
    else return {"status":"error","message":"failed sending message"}
  } catch (error) {
    axios_error_logger('https://api.jumper.ai/chat/send-message',error)
    return {"status":"error","message":"failed sending message"}
  }
}


//Get the jumper token
async function jumper_token(){

  //get the auth token stored in redis
  // var val = await dt_get("jumper_auth_token")
  var val = await getAuthToken();

  //if we find the token, let's use it
  if (val){
    console.log("auth_token_found: ")
    return val
  }

  //If we no token is stored, means it's either expired or first use
  // if(val==null){

  //   refresh_jumper_tokens()
  // }
}


//refresh token function

async function refresh_jumper_tokens() {

  //let's try getting our stored refresh token to generate a new auth
  console.log("Refreshing token")
  // token = await dt_get("jumper_refresh_token")
  token = await getRefreshToken();
  
  //if no refresh token is stored, manually generate a new one and put it here
  //you can manually store the refresh token in redis using the key "jumper_refresh_token"
  if (token == null) {
    console.log("Using seed Refresh Token")
    token = process.env.SEED_REFRESH_TOKEN
  }else{
    console.log("Found A recent Refresh token, ",token)
  }
  let data = qs.stringify({
    'refresh_token': token,
    'grant_type': 'refresh_token' 
  });
  
  // let's use the refresh token to generate auth using our basic auth: https://developers.jumper.ai/docs/oauth-api/1/routes/oauth/refresh/post
  // 'Basic base64<client_key + ":" + client_secret>'
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.jumper.ai/oauth/refresh',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': process.env.JUMPER_BASIC_AUTH
    },
    data : data
  };

  try {
    const response = await axiosInstance.request(config);
    console.log(response.data)
    // await dt_store("jumper_auth_token",response.data.access_token,{EX: 2000000})
    // await dt_store("jumper_refresh_token", response.data.refresh_token)
    await store_auth_token({ auth_token: response.data.access_token});
    await store_refresh_token({ refresh_token: response.data.refresh_token});
    return response.data.access_token;
  } catch (error) {
    console.error(error);
    axios_error_logger(error)
    return null
  }
}

//fetch jumper social channels so we can get the Whatsapp PageID
async function jumper_fetch_social_channels(){
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.jumper.ai/chat/get-social-channels',
    headers: { 
      'Authorization': `Bearer ${await jumper_token()}`
    }
  };
  try {
    const response = await axiosInstance.request(config);
    return response.data
  } catch (error) {
    axios_error_logger('https://api.jumper.ai/chat/get-social-channels',error)
    return null
  }
}

//fetch templates available
async function jumper_fetch_templates(){
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.jumper.ai/chat/fetch-whatsapp-templates?limit=all',
    headers: { 
      'Authorization': `Bearer ${await jumper_token()}`
    }
  };
  try {
    const response = await axiosInstance.request(config);    
    return response.data.data
  } catch (error) {
    axios_error_logger('https://api.jumper.ai/chat/fetch-whatsapp-templates',error)
    return null
  }
}

//Set callback subscription
async function jumper_set_subscription(){
  exisiting = false
  subscriptions = await jumper_fetch_subscriptions()
  if(subscriptions){
    await subscriptions.forEach(async (sub) => {
      found_webhook = findKeyValue(sub,"webhook", callback_url)
      //if we find it, let's look if the language is supported by the template
      if(found_webhook.length>0){
        console.log("found existing webhook")
        exisiting = true
      }
    });
  }
  if(exisiting){
    return subscriptions
  }
  let data = qs.stringify({
    'data': `[{"permission":"livechat","webhook":"${callback_url}"}]`
  });
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.jumper.ai/app/add-subscription',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded', 
      'Authorization': `Bearer ${await jumper_token()}`
    },
    data : data
  };

  try {
    const response = await axiosInstance.request(config);    
    return response.data.data
  } catch (error) {
    axios_error_logger(error)
    return null
  }
}

//getch callback subscription
async function jumper_fetch_subscriptions(){
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.jumper.ai/app/list-subscription',
    headers: { 
      'Authorization': `Bearer ${await jumper_token()}`
    }
  };

  try {
    const response = await axiosInstance.request(config);    
    return response.data.data
  } catch (error) {
    axios_error_logger('https://api.jumper.ai/app/list-subscription', error)
    return null
  }
}

server.on('request', app)

server.listen(port, async () => {
  console.log(`Starting server at port: ${port}`)
  // whatsapp_id = await dt_get("whatsapp_id")
  whatsapp_id = await get_wa_id();
  if(whatsapp_id == null){
    console.log("No WA ID found, getting from env and storing it", process.env.WA_ID)
    // await dt_store("whatsapp_id", process.env.WA_ID)
    await store_wa_id({ whatsapp_id: process.env.WA_ID})
  }

});

// const localtunnel = require('localtunnel');
// (async () => {
//   const tunnel = await localtunnel({
//     subdomain: "bjtestvonage01",
//     port: 3000
//   });
//   console.log(`App available at: ${tunnel.url}`);
// })()
