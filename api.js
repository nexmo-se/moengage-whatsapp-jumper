const nodeFetch = require("node-fetch");
const FormData = require("form-data");
const axios = require('axios');
const { getAuthToken, get_message_by_wa_message_id } = require('./datastore');
const moengage_callback = process.env.MOENGAGE_CALLBACK_URL;

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


const postFormData = async function (url, body) {
  try {
    const token = await getAuthToken();
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
  const { mo_msg_id } = await get_message_by_wa_message_id({ wa_message_id })
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
    return await axiosApiCall(moengage_callback, data, 'post');
  } else {
    console.error('MoEngage Message Id Not Found by wa_message_id:' + wa_message_id)
    return { error: true }
  }
}

module.exports = { postFormData, axios_error_logger, axiosApiCall, axiosInstance, updateStatusToMoEngage };