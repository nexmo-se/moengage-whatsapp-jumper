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


app.post('/jumper_callback', (req, res) => {
  console.log("post",req.body)
  res.json(200);
});

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
          dat = await sendWhatsappMessage(template_languge.id,data.to)
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
async function sendWhatsappMessage(template_id, number, options={}){
  socialChannels = await jumper_fetch_social_channels();
  let data = qs.stringify({
    'pageid': socialChannels.whatsapp.id,
    'conversationid': number,
     'channel':'whatsapp',
     'message':`s3ndt3mpl4te_${template_id}`,
     'messagetype':"template"
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
    return response.data
  } catch (error) {
    console.log(error);
    return null
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
      callback(error)
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
    callback(error)
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
    callback(error)
    return null
  }
}

server.on('request', app)

server.listen(port, async () => {
  console.log(`Starting server at port: ${port}`)
  console.dir(await jumper_fetch_social_channels(), {depth:9})
});

// const localtunnel = require('localtunnel');
// (async () => {
//   const tunnel = await localtunnel({
//     subdomain: "bjtestvonage01",
//     port: 3000
//   });
//   console.log(`App available at: ${tunnel.url}`);
// })()
