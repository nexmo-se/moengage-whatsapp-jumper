require('dotenv').config();
const jumperMessage = require('./jumperMessage');
const { postFormData, axios_error_logger, axiosInstance, updateStatusToMoEngage } = require('../utils/api');

const controller = {
  getMessageStatusFromRequest: (req) => {
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
  },
  jumperCallback: async (req) => {
    console.log('callback init', JSON.stringify(req.body))
    const {status, wa_message_id} = controller.getMessageStatusFromRequest(req);
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
  }
};

module.exports = controller;
