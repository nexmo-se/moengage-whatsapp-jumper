console.log("Starting Messaging Demo")
require('dotenv').config();
const express = require('express');
const app = express();
const server = require('http').createServer();
const axios = require('axios');
const qs = require('qs');
const {pRateLimit} = require('p-ratelimit');
//const client = require("redis").createClient(6379, "127.0.0.1") //
const port = process.env.PORT || 3001;
const callback_url =process.env.SUBSCRIBED_CALLBACK_URL
const moengage_callback = process.env.MOENGAGE_CALLBACK_URL
var morgan = require('morgan')
var timeout = require('connect-timeout')
const {addTask} = require('./http_task_que')
const {getAuthToken, getRefreshToken, get_templates, get_wa_id, store_auth_token, store_refresh_token, store_templates, store_message, store_wa_id, get_whitelist, get_message_by_conv_id, get_message_by_wa_message_id} = require('./datastore');


const axios_error_logger = (url, error) => {
  if (error && error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error("Error on",error.response.request.method,"call to:", url);
    console.error("Error Response Data", error.response.data);
    console.error("Error Response Status", error.response.status);
    console.error("Error Response Headers", error.response.headers);
  } else if (error && error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.error("Error Requesting to URL:", url);
    console.error({"code":error.code,"IP":error.address,"port":error.port});
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Error', error && error.message || error);
  }
  //console.log(error.config);
}

// The kind for the new entity
const kind = process.env.DT_KIND;

var whatsapp_id = null

const Agent = require('agentkeepalive');
const { exit } = require('process');
const keepAliveAgent = new Agent({
  maxSockets: parseInt(process.env.MAX_SOCKETS),
  maxFreeSockets: parseInt(process.env.MAX_FREE_SOCKETS),
  timeout: parseInt(process.env.SOCKET_TIMEOUT), // active socket keepalive for 60 seconds
  freeSocketTimeout: parseInt(process.env.FREE_SOCKET_KEEPALIVE), // free socket keepalive for 30 seconds
});

const httpsKeepAliveAgent = new Agent.HttpsAgent({
  maxSockets: parseInt(process.env.MAX_SOCKETS),
  maxFreeSockets: parseInt(process.env.MAX_FREE_SOCKETS),
  timeout: parseInt(process.env.SOCKET_TIMEOUT), // active socket keepalive for 60 seconds
  freeSocketTimeout: parseInt(process.env.FREE_SOCKET_KEEPALIVE), // free socket keepalive for 30 seconds
});

const axiosInstance = axios.create({httpAgent: keepAliveAgent, httpsAgent: httpsKeepAliveAgent});



app.use(timeout(process.env.RESPONSE_TIMEOUT || "30s"))
app.use(morgan('combined'))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//token that Authenticates Moengage
const _token = process.env.MOENGAGE_AUTH_AGAINST
const findKeyValue = (obj, key, val) =>
  Object.keys(obj).filter(k => obj[key] === val && k ===key );


//Rate Limiter Code
const limiter = pRateLimit({
  interval: 500, // 1000 ms == 1 second
  rate: parseInt(process.env.RATE_PER_SECOND), // 10 API calls per interval
  concurrency: parseInt(process.env.CONCURRENT_API_CALLS), // no more than 10 running at once
  maxDelay: Math.ceil( (60 * 1000) * 60), // an API call delayed > 2 sec is rejected
});


// (async () => {
//   try {
//     client.on('error', err => console.log('Redis Client Error', err));
//     await client.connect();
//   } catch (err) {
//     console.log(err);
//   }
// })();


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

ipWhitelist = async (req, res, next) => {
  var invalidMasheryIP = true;
  var reqIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  reqIp = reqIp.split(",")
  var whitelist = await get_whitelist()
  console.log("Request coming from:",reqIp)
  for (var i = 0, len = reqIp.length; i < len; i++) {
    if (whitelist.includes(reqIp[i].trim())){
      console.log("IP is Whitelisted, Continue")
      invalidMasheryIP = false;
      next();
    }
  }

  if (invalidMasheryIP) {
      console.error(`An unauthorized IP address ${reqIp} has tried to access the service`);
      res.status(403).end();
  }
}

app.get('/', (req, res) => {
  res.json(200);
});

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

app.post('/jumper_callback', async (req, res) => {
  console.log("post Callback: ")
  console.log(JSON.stringify(req.body))
  payload = req.body.event
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
  const message = get_message_by_wa_message_id({ wa_message_id: message_id })
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

app.get('/jumper_callback', (req, res) => {
  console.log("get",req.query)
  res.json(req.query, 200);
});

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

app.post('/jumper_send_whatsapp', moengage_auth, async (req, res) => {

  try {
    console.log("post Whatsapp: ", JSON.stringify(req.body));
    let campaign_id = req.query.campaign_id, data = req.body, found = false;

    let templates = await get_templates(); // get templates cached in store
    let foundTemplate = templates?.find(t => t.template_name == data.template.name)

    if (!templates?.length || !foundTemplate) {
      console.log('fetch templates');
      templates = await jumper_fetch_templates();
      await store_templates({templates})
    }

    foundTemplate = templates.find(t => t.template_name == data.template.name)

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
      return res.status(500).send(mes);
    }
  } catch (error) {
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
  console.log("Message ID from Moengage: ", msg_id)
  

  var components = {"HEADER":[],"BODY":[],"BUTTONS":[]}
  if(_components){
    for(comp of _components){
      if(comp.type=="header"){
        var p = new Array()
        for(params of comp.parameters){
          h = {}
          link = params["image"]["link"]
          h[link] = "image"
          components["HEADER"].push(h)
        }        
      }
      if(comp.type=="body"){
        var p = new Array()
        for(params of comp.parameters){
          h = {}
          if(params["type"]=="text"){
            text = params["text"]
            h[""+String(text)] = "text"
            components["BODY"].push(h)
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
        
        comp["index"] = Number(comp["index"])
        
        components["BUTTONS"].push(comp)
      }
    }
  }

  console.log("Generated Components")
  console.dir(components, {depth:9})

  let data = qs.stringify({
    'pageid': whatsapp_id,
    // 'conversationid': number,
    'to': number,
     'channel':'whatsapp',
     'message':`s3ndt3mpl4te_${template_id}`,
     'messagetype':"template",
     'message_params':JSON.stringify(components)
  });
  console.log("Data to be sent:", data)
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.jumper.ai/chat/send-message',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded', 
      'Authorization': `Bearer ${await jumper_token()}`
    },
    data : data
  };

  try {
    const response = await axiosInstance.request(config);
    console.log(JSON.stringify(response.data))
    if (response.data.success == true){
      // await dt_store("message_id_"+response.data.message_id, msg_id, {EX: 604800})
      // await dt_store("conv_id_waba_"+response.data.conversationid, waba_number, {EX: 604800})
      // await dt_store("conv_id_moengage_msg_id_"+response.data.conversationid, msg_id, {EX: 604800})
      // await dt_store("conv_id_moengage_template_id_" + response.data.conversationid, template_id, { EX: 604800 })

      const message = {
        mo_msg_id: msg_id,
        mo_waba_number: waba_number,
        mo_template_id: template_id,
        wa_message_id: response.data.message_id,
        wa_conv_id: response.data.conversationid,
        campaign_id: campaign_id || ''
      }

      await store_message(message)
      return {"status":"success","message":response.data}
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
    url: 'https://api.jumper.ai/chat/fetch-whatsapp-templates',
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
  
  // console.dir(await  jumper_set_subscription(), {depth:9})
  //   // Rate Limiter Code
  // // empty promise to ignite rate limit queue

  // await limiter(() => new Promise((resolve) => {
  //   resolve();
  // }));

});

// const localtunnel = require('localtunnel');
// (async () => {
//   const tunnel = await localtunnel({
//     subdomain: "bjtestvonage01",
//     port: 3000
//   });
//   console.log(`App available at: ${tunnel.url}`);
// })()
