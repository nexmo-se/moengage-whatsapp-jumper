console.log("Starting Messaging Demo")
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const app = express();
const server = require('http').createServer();
const axios = require('axios');
const qs = require('qs');
const client = require("redis").createClient()
const port = process.env.PORT || 3001;
const callback_url = "https://test.urzo.online/jumper_callback"
const moengage_callback = "https://test.urzo.online/moengage_callback"

const findKeyValue = (obj, key, val) =>
  Object.keys(obj).filter(k => obj[key] === val && k ===key );

(async () => {
  try {
    client.on('error', err => console.log('Redis Client Error', err));
    await client.connect();
  } catch (err) {
    console.log(err);
  }
})();


app.set('view engine', 'ejs'); 
app.use('/', express.static(path.join(__dirname, 'static')));
app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use("/js", express.static(path.join(__dirname, "node_modules/nexmo-client/dist")));


app.get('/', (req, res) => {
  res.json(200);
});

app.post('/moengage_callback', async (req, res) => {
  console.log("moengage post",req.body)
  res.send(200)
})

app.get('/list_jumper_templates', async (req, res) => {
  console.log("moengage post",req.body)
  var templates = await jumper_fetch_templates()
  res.json(templates)
})

app.post('/jumper_callback', async (req, res) => {
  console.log("post Callback: ")
  console.dir(req.body, {depth:9})
  payload = req.body.event
  if(payload.subscription_type=="livechat"){
    if(!payload.data.agent){ //means it's from the user
      reply_message = await create_moengage_reply(payload.data.messageid, payload.data.conversationid,payload.data.message,payload.data.mobilecountrycode+payload.data.mobile)
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
        const response = await axios.request(config);
        console.log(response.data)
        if (response.data.success == true){
          return {"status":"success","message":response.data}
        }
        else return {"status":"error","message":"failed sending  callback to moengage"}
      } catch (error) {
        console.log(error);
        return {"status":"error","message":"failed sending callback to moengage"}
      }
    }
  }
  
  res.json(200);
});


async function create_moengage_reply(message_id, conv_id, message, to){
  var waba_number = await client.get("conv_id_waba_"+conv_id)
  return {
    "from": to,
    "waba_number": waba_number,
    "timestamp": Date.now(),
    "type": "text",
    "context": {
      "msg_id": message_id
    },
    "text": { 
      "body": message
      },
    }
}

app.get('/jumper_callback', (req, res) => {
  console.log("get",req.query)
  res.json(req.query, 200);
});

app.post('/jumper_send_whatsapp', async (req, res) => {
  console.log("post",req.body)
  data = req.body
  templates = await jumper_fetch_templates();
  found = false

  //let's look for the template
  await templates.forEach(async (template) => {
    found_template = findKeyValue(template,"template_name", data.template.name)
    //if we find it, let's look if the language is supported by the template
    if(found_template.length>0){
      await template.templates.forEach(async (template_languge) => {
        found_language = findKeyValue(template_languge,"language", data.template.language.code)
        //if we find the language, let's send the message
        if(found_language.length>0){
          found=true
          components = null
          if(data.template.components) components = data.template.components
          dat = await sendWhatsappMessage(template_languge.id,data.to,data.msg_id, data.from, components)
          res.json(dat).end
        }
      })
    }
  })

  if(!found){
    mes = {
      "status": "failure",
      "error" : {
      "code" : "01",
      "message" : "TEMPLATE NOT FOUND"
      }
    }
    res.json(mes);
  }
  
});


//send whatsapp message with template
async function sendWhatsappMessage(template_id, number, msg_id, waba_number,_components){
  socialChannels = await jumper_fetch_social_channels();

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
          
        
        components["BUTTONS"].push(comp)
      }
    }
  }

  console.log("Generated Components")
  console.dir(components, {depth:9})  

  let data = qs.stringify({
    'pageid': socialChannels.whatsapp.id,
    'conversationid': number,
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
    const response = await axios.request(config);
    console.log(response.data)
    if (response.data.success == true){
      client.set("message_id_"+response.data.message_id, msg_id)
      client.set("conv_id_waba_"+response.data.conversationid, waba_number)
      return {"status":"success","message":response.data}
    }
    else return {"status":"error","message":"failed sending message"}
  } catch (error) {
    console.log(error);
    return {"status":"error","message":"failed sending message"}
  }
}


//Get the jumper token
async function jumper_token(){

  //get the auth token stored in redis
  var val = await client.get("jumper_auth_token")

  //if we find the token, let's use it
  if (val){
    console.log("auth_token_found: ",val)
    return val
  }

  //If we no token is stored, means it's either expired or first use
  if(val==null){

    //let's try getting our stored refresh token to generate a new auth
    console.log("Using stored Refresh Token")
    token = await client.get("jumper_refresh_token")
    
    //if no refresh token is stored, manually generate a new one and put it here
    //you can manually store the refresh token in redis using the key "jumper_refresh_token"
    if(token==null){
      console.log("Using seed Refresh Token")
      token = "PUT_INITIAL_REFRESH_TOKEN_HERE"
    }
    let data = qs.stringify({
      'refresh_token': token,
      'grant_type': 'refresh_token' 
    });
    
    //let's use the refresh token to generate auth using our basic auth: https://developers.jumper.ai/docs/oauth-api/1/routes/oauth/refresh/post
    // 'Basic base64<client_key + ":" + client_secret>'
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.jumper.ai/oauth/refresh',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded', 
        'Authorization': 'Basic b0RSMmdQRmgxTWtFZTBTbjFBSVNhTGJUOTBTU1M3bHA6SVZSWVI4d3R3MVpnaWJBWQ=='
      },
      data : data
    };
  
    try {
      const response = await axios.request(config);
      console.log(response.data)
      client.set("jumper_auth_token",response.data.access_token,{EX: 2000000})
      client.set("jumper_refresh_token",response.data.refresh_token)
      return response.data.access_token
    } catch (error) {
      console.log(error);
      return null
    }
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
    const response = await axios.request(config);
    return response.data
  } catch (error) {
    console.log(error);
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
    const response = await axios.request(config);    
    return response.data.data
  } catch (error) {
    console.log(error);
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
    const response = await axios.request(config);    
    return response.data.data
  } catch (error) {
    console.log(error);
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
    const response = await axios.request(config);    
    return response.data.data
  } catch (error) {
    console.log(error);
    return null
  }
}

server.on('request', app)

server.listen(port, async () => {
  console.log(`Starting server at port: ${port}`)
  
  console.dir(await  jumper_set_subscription(), {depth:9})
});

// const localtunnel = require('localtunnel');
// (async () => {
//   const tunnel = await localtunnel({
//     subdomain: "bjtestvonage01",
//     port: 3000
//   });
//   console.log(`App available at: ${tunnel.url}`);
// })()
