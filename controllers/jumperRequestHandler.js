require('dotenv').config();
const jumperMessage = require('./jumperMessage');
const { axios_error_logger, axiosInstance, updateStatusToMoEngage } = require('../utils/api');
const {get_message_by_wa_message_id, store_message} = require('../datastore/datastore.js');


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

      // need more payload to segregate click event
      } else if(type == 'NEW' && subscription_type == 'livechat' && !!data.message && data.replytomessage?.replied && data.replytomessage?.messageid){
        wa_message_id = data.replytomessage?.messageid;
        return { status: 'clicks', wa_message_id, message: data.message }

      } else {
        return {}
      }
  
    } catch (error) {
      console.error('error:', JSON.stringify(error));
      return {}
    }
  },
  jumperCallback: async (req, res) => {
    console.log('callback init', JSON.stringify(req.body))
    const {status, wa_message_id, message} = controller.getMessageStatusFromRequest(req);
    console.log('status:', JSON.stringify({ status, wa_message_id }));

    if( !wa_message_id ) {
      return res.json({ "status": "error", "message": "failed sending  callback to moengage, wa_message_id not found" });
    }

    try {
      // update message to store
      const objMessage = await get_message_by_wa_message_id({wa_message_id}) || {};
      if (status && objMessage?.wa_message_id) {
        if(!objMessage.status) {
          objMessage.status = {};
        }
        objMessage.status[status] = true;
        objMessage.final_status = status;
        console.log('input to update message status', JSON.stringify(objMessage));
        const data = await store_message(objMessage);

        console.log('response of update message status in data store:', JSON.stringify(data));
      } else {
        console.error('Wa_Message_Id Not Found by wa_message_id:' + objMessage?.wa_message_id);
      }
    } catch (error) {
      console.log("error while updating message status in data store", error);
    }

    // update message to mo engage
    if(status && wa_message_id) {
      // await store_message(message)
      const response = await updateStatusToMoEngage({messageStatus: status, wa_message_id, message})
      const responseData = response?.data;
      console.log('updateStatusToMoEngage response ', JSON.stringify(responseData));
      if (responseData?.status == "success") {
        console.log(`${wa_message_id} successfully status updated as ${status}`)
        return res.json({"status":"success","message":`MoEngage status updated as "${status}" for message id: ${wa_message_id}`})
      }
    }
    console.error(`${wa_message_id} error in status update, status: ${status}, wa_message_id: ${wa_message_id}`);
    return res.json({ "status": "error", "message": "failed sending  callback to moengage" })
  }
};

module.exports = controller;
