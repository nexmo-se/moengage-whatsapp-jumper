const nodeFetch = require("node-fetch");
const FormData = require("form-data");
const axios = require('axios');
const moengage_callback = process.env.MOENGAGE_CALLBACK_URL;
const {getUserDetailsBy_UID, getUserDetailsBy_uid_shop_name, get_message_by_wa_message_id} = require('../datastore/datastore.js');
const apiRoot = 'https://api.jumper.ai/';

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

const getJumperToken = async function(params) {
  if (params && params.token) {
    return params.token;
  } else if (params.uid_shop_name) {
    const userDetails = await getUserDetailsBy_uid_shop_name(params.uid_shop_name);
    if (userDetails) {
      return userDetails.token;
    }
  } else if (params?.uid) {
    const userDeails = await getUserDetailsBy_UID(params.uid);
    if (userDeails) {
      return userDeails.token;
    }
  }
};

const postFormData = async function (url, body, jumperToken, uid_shop_name) {
  try {
    let token;
    if(jumperToken) {
      token = jumperToken;
    } else {
      token = await getJumperToken({uid_shop_name});
    }
    const apiToCall = url;
    const formData = new FormData();
    Object.keys(body).forEach((key) => {
      const value = body[key];
      formData.append(key, value);
    });
    console.log(`calling ${url}, Data: ${JSON.stringify(body)}`)
    const response = await nodeFetch(apiToCall, {
      method: "POST",
      body: formData,
      headers: {"Authorization": `Bearer ${token}`},
    });
    return response;
  } catch (error) {
    console.error(error)
  }
  
};

const axiosApiCall = async function (url, data, method = 'post') {
  try{
    let config = {
      method: method,
      maxBodyLength: Infinity,
      url: url,
      headers: { 
        'Content-Type': 'application/json'
      },
      data : data
    };
    console.log(`axios calling url: ${url}`, JSON.stringify(config));
    const response = await axiosInstance.request(config);
    return response;
  } catch (error) {
    axios_error_logger(url, error)
    return { error: true }
  }
}

const fetch = async function(url, auth) {
  const token = await getJumperToken(auth);
  const apiToCall = url.includes("http") ? url : `${apiRoot}${url}`;
  const response = await nodeFetch(apiToCall, {headers: {"Authorization": `Bearer ${token}`}});
  return response;
};

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

const updateStatusToMoEngage = async function(messageStatus, wa_message_id) {
  const { mo_msg_id, uid_shop_name } = await get_message_by_wa_message_id({ wa_message_id }) || {};
  const { dlr_web_hook_url } = await getUserDetailsBy_uid_shop_name(uid_shop_name)
  if (mo_msg_id) {
    console.log('MoEngage Message Id Found by wa_message_id:' + wa_message_id)
    const data = {
      statuses: [
        {
          msg_id: mo_msg_id,
          status: messageStatus,
          timestamp: Date.now()
        }
      ]
    }
    console.log('Update MoEngage Status data:', JSON.stringify(data))
    return await axiosApiCall(dlr_web_hook_url || moengage_callback, data, 'post');
  } else {
    console.error('MoEngage Message Id Not Found by wa_message_id:' + wa_message_id)
    return { error: true }
  }
}

const refreshToken = async function(body) {
  const params = new URLSearchParams();
  params.append('refresh_token', body.refresh_token?.trim());
  params.append('grant_type', 'refresh_token');

  const clientKey_secretKey = `${body.client_key}:${body.secret_key}`;
  const base64Encoded = Buffer.from(clientKey_secretKey).toString('base64');

  console.log('input for refresh token', body.refresh_token, clientKey_secretKey, base64Encoded);


  // return '';
  const response = await nodeFetch('https://api.jumper.ai/oauth/refresh', {
    method: 'POST',
    body: params,
    headers: {"Authorization": `Basic ${base64Encoded}`, 'Content-Type': 'application/x-www-form-urlencoded'},
  });
  const data = await response.json();

  return data;
};

const verifyJumperSavedToken = async function({uid_shop_name}) {
  const {status, data} = await fetchWaTemplates(1, {uid_shop_name});
  return {status, verified: data.data && data.data.length};
};

const fetchSocialChannels = async function(body) {
  const {status, data} = await fetchWaTemplates(1, body);
  return {status, verified: data.data && data.data.length};
};

const fetchWaTemplates = async function(limit, auth) {
  const response = await fetch(`chat/fetch-whatsapp-templates?limit=${limit}`, auth);
  const data = await response.json();
  return {status: response.status, data};
};

const fetchWaTemplate = async function(id, auth) {
  const response = await fetch(`get-whatsapp-template?id=${id}`, auth);
  const data = await response.json();
  return data;
};

module.exports = { postFormData, refreshToken, verifyJumperSavedToken, fetchSocialChannels, fetchWaTemplates, axios_error_logger, axiosApiCall, axiosInstance, updateStatusToMoEngage, getJumperToken };