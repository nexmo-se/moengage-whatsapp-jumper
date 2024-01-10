const {dt_store, dt_get, getUsersToUpdateToken, getUsersByToken} = require('../datastore/datastore.js');
const util = require('../utils/util.js');
const { axiosInstance, axios_error_logger } = require('../utils/api.js');

const model = {
  getSocialChannels: async (jumperToken) => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://api.jumper.ai/chat/get-social-channels',
      headers: { 
        'Authorization': `Bearer ${jumperToken}`
      }
    };
    try {
      const response = await axiosInstance.request(config);
      return response.data
    } catch (error) {
      axios_error_logger('https://api.jumper.ai/chat/get-social-channels',error)
      return null
    }
  },
};

module.exports = model;
