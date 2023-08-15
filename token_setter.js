console.log("Refreshing Tokens")
require('dotenv').config();
const axios = require('axios');
const qs = require('qs');

const {Datastore} = require('@google-cloud/datastore');

const axios_error_logger = (url, error) =>{
  if (error.response) {
    console.error("Error on",error.response.request.method,"call to:", url);
    console.error("Error Response Data", error.response.data);
    console.error("Error Response Status", error.response.status);
    console.error("Error Response Headers", error.response.headers);
  } else if (error.request) {
    console.error("Error Requesting to URL:", url);
    console.error({"code":error.code,"IP":error.address,"port":error.port});
  } else {
    console.error('Error', error.message);
  }
}

const datastoreDetails = {
  projectId: process.env.DT_PROJECT_ID,
};

// code to connect from local
if (process.env.DT_JSON_PATH) {
  datastoreDetails.keyFilename = process.env.DT_JSON_PATH;
}

const datastore = new Datastore(datastoreDetails);

 // The kind for the new entity
 const kind = process.env.DT_KIND;

 async function dt_store(key, value, opt={}){
  const taskKey = datastore.key([kind, key]);
  const task = {
    key: taskKey,
    data: {value: value},
  };
  await datastore.save(task);
 }

 async function dt_get(key){
  const taskKey = datastore.key([kind, key]);
  const task = await datastore.get(taskKey)
  if(task[0]==undefined) return null
  return task[0].value
 }

const Agent = require('agentkeepalive');
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



async function refresh_jumper_tokens(){
  //let's try getting our stored refresh token to generate a new auth
  console.log("Refreshing token")
  token = await dt_get("jumper_refresh_token")
  
  //if no refresh token is stored, manually generate a new one and put it here
  //you can manually store the refresh token in redis using the key "jumper_refresh_token"
  if(token==null || token == ''){
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
    await dt_store("jumper_auth_token",response.data.access_token,{EX: 2000000})
    await dt_store("jumper_refresh_token",response.data.refresh_token)
    return {"access_token":response.data.access_token, "refresh_token": response.data.refresh_token}
  } catch (error) {
    axios_error_logger(error)
    return null
  }
}


(async () => {
  try {
    //await dt_store("jumper_refresh_token","")
    await refresh_jumper_tokens()
  } catch (err) {
    console.log(err);
  }
})();
