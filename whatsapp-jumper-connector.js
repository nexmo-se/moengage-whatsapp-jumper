console.log("Starting Messaging Demo")
require('dotenv').config();
const express = require('express');
const app = express();
const server = require('http').createServer();
const axios = require('axios');
const qs = require('qs');
const {pRateLimit} = require('p-ratelimit');
const client = require("redis").createClient(6379, "127.0.0.1") //
const port = process.env.PORT || 3001;
const callback_url =process.env.SUBSCRIBED_CALLBACK_URL
const moengage_callback = process.env.MOENGAGE_CALLBACK_URL
const schedule = require('node-schedule');
var morgan = require('morgan')

const Agent = require('agentkeepalive');
const keepAliveAgent = new Agent({
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
});

const httpsKeepAliveAgent = new Agent.HttpsAgent({
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
});

const axiosInstance = axios.create({httpAgent: keepAliveAgent, httpsAgent: httpsKeepAliveAgent});


app.use(morgan('combined'))

//token that Authenticates Moengage
const _token = process.env.MOENGAGE_AUTH_AGAINST
const findKeyValue = (obj, key, val) =>
  Object.keys(obj).filter(k => obj[key] === val && k ===key );


//Sachin's Rate Limiter Code
const limiter = pRateLimit({
  interval: 500, // 1000 ms == 1 second
  rate: 10, // 10 API calls per interval
  concurrency: 10, // no more than 10 running at once
  maxDelay: Math.ceil( (60 * 1000) * 60), // an API call delayed > 2 sec is rejected
});


(async () => {
  try {
    client.on('error', err => console.log('Redis Client Error', err));
    await client.connect();
  } catch (err) {
    console.log(err);
  }
})();


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
moengage_auth = function(req, res, next) {
  console.log("post",req.body)
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
        console.log(error);
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
        console.log(error);
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
    waba_number = await client.get("conv_id_waba_"+replytomessage.conversationid)
    moengage_msg_id = await client.get("conv_id_moengage_msg_id_"+replytomessage.conversationid)
    template_id = await client.get("conv_id_moengage_template_id_"+replytomessage.conversationid)
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
  var moengage_msg_id = await client.get("message_id_"+message_id)
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

app.post('/jumper_send_whatsapp', moengage_auth, async (req, res) => {
  //--> add ratelimit 10 calls per second. Queue the calls
  console.log("post Whatsapp: ")
  console.dir(req.body, {depth:9})
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

          //Sachin's Rate Limiter Code
          // empty promise to ignite rate limit queue
          await limiter(() => new Promise((resolve) => {
            resolve();
          }));

          const dat = await limiter(() => sendWhatsappMessage(template_languge.id,data.to,data.msg_id, data.from, components));
          //
          
          return res.json(dat).end
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
    return res.json(mes);
  }
  
});


//send whatsapp message with template
async function sendWhatsappMessage(template_id, number, msg_id, waba_number,_components){
  console.log("Message ID from Moengage: ", msg_id)
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
        
        comp["index"] = Number(comp["index"])
        
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
    const response = await axiosInstance.request(config);
    console.log(response.data)
    if (response.data.success == true){
      client.set("message_id_"+response.data.message_id, msg_id, {EX: 604800})
      client.set("conv_id_waba_"+response.data.conversationid, waba_number, {EX: 604800})
      client.set("conv_id_moengage_msg_id_"+response.data.conversationid, msg_id, {EX: 604800})
      client.set("conv_id_moengage_template_id_"+response.data.conversationid, template_id, {EX: 604800})
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

    refresh_jumper_tokens()
  }
}


//refresh token function

async function refresh_jumper_tokens(){
  //let's try getting our stored refresh token to generate a new auth
  console.log("Refreshing token")
  token = await client.get("jumper_refresh_token")
  
  //if no refresh token is stored, manually generate a new one and put it here
  //you can manually store the refresh token in redis using the key "jumper_refresh_token"
  if(token==null){
    console.log("Using seed Refresh Token")
    token = process.env.SEED_REFRESH_TOKEN
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
    client.set("jumper_auth_token",response.data.access_token,{EX: 2000000})
    client.set("jumper_refresh_token",response.data.refresh_token)
    return response.data.access_token
  } catch (error) {
    console.log(error);
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
    const response = await axaxiosInstanceios.request(config);
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
    const response = await axiosInstance.request(config);    
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
    const response = await axiosInstance.request(config);    
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
    const response = await axiosInstance.request(config);    
    return response.data.data
  } catch (error) {
    console.log(error);
    return null
  }
}

server.on('request', app)

server.listen(port, async () => {
  console.log(`Starting server at port: ${port}`)

  //refresh tokens on start
  await refresh_jumper_tokens()
  
  console.dir(await  jumper_set_subscription(), {depth:9})

  //refresh the tokens every midnight
  const job = schedule.scheduleJob('0 0 * * *', function(){
    refresh_jumper_tokens()
  });
});

// const localtunnel = require('localtunnel');
// (async () => {
//   const tunnel = await localtunnel({
//     subdomain: "bjtestvonage01",
//     port: 3000
//   });
//   console.log(`App available at: ${tunnel.url}`);
// })()
