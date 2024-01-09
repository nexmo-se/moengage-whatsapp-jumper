const {json} = require('express');
const api = require('../utils/api');
const {dt_store, dt_get, get_message_by_wa_message_id, store_message} = require('../datastore/datastore.js');

const controller = {
  sendWhatsAppMessage: async (req, res, requestParams) => {
    // sfmc.getPhoneNumber();
    const inArguments = requestParams.inArguments[0];
    try {
      console.log('debug-sendWhatsAppMessage init');
      // req.body.jsonPayload.inArguments[0];
      let message = inArguments.message;
      const MID = `${inArguments.MID}_${req.params.shopName}`;
      const mobileNumber = inArguments.sendTo;
      const templateId = 's3ndt3mpl4te_' + inArguments.templateId;
      console.log('debug templateId:' + templateId, 'MID:' + MID);
      Object.keys(inArguments).forEach((key) => {
        if (key !== 'message') {
          if (message.includes(key)) {
            const value = inArguments[key];
            message = message.replaceAll(key, value);
          }
        }
      });

      const body = {
        // pageid: 4885823201869824,
        // conversationid: mobileNumber,
        to: mobileNumber,
        channel: 'whatsapp',
        message: templateId,
        messagetype: 'template',
        message_params: message,
        MID,
      };

      console.log('debug-execute body' + MID, JSON.stringify(body));

      // ------- sending message with rate limit start ------
      // empty promise to ignite rate limit queue
      // await limiter(() => new Promise((resolve) => {
      //   resolve();
      // }));

      const data = await api.sendMessage(body);
      // ******** sending message with rate limit end ********

      const {conversationid, message_id, success, errorMessage} = data?.data || {};
      const {definitionInstanceId, journeyId, activityId, activityInstanceId, activityObjectID} = requestParams || {};
      const msgStatus = {
        MID: inArguments.MID,
        shopName: req.params.shopName,
        wa_message_id: message_id,
        wa_conv_id: conversationid,
        wa_template_id: templateId,
        sent_to: mobileNumber,
        definitionInstanceId,
        journeyId,
        activityId,
        activityInstanceId,
        activityObjectID,
        status: success ? {'SENT': true} : {'FAILED': true},
        errorMessage: success ? "" : errorMessage,
      };
      await store_message(msgStatus);

      console.log('debug-send_message response ' + MID, JSON.stringify(data));

      // return res.status(200).json({"foundSignupDate": "2023-10-23"});
      const status = success == true ? 200 : 500;
      const responseBack = {'success': status == 200 ? 'true' : 'false'};
      console.log('debug-send_message response back ' + MID);
      console.log(JSON.stringify(responseBack));
      return res.status(status).json(responseBack);
    } catch (err) {
      console.log(err);
      console.error('WA_MSG_ERROR', JSON.stringify(err));
      return res.status(500).json({'success': 'false'});
    }
  },
  sendTextMessage: async (req, res, inArguments) => {
    // sfmc.getPhoneNumber();
    try {
      console.log('debug-text-message init');
      // req.body.jsonPayload.inArguments[0];
      let message = inArguments.message;
      const MID = `${inArguments.MID}_${req.params.shopName}`;
      const mobileNumber = inArguments.sendTo;
      console.log('debug MID:' + MID);
      Object.keys(inArguments).forEach((key) => {
        if (key !== 'message') {
          if (message.includes(key)) {
            const value = inArguments[key];
            message = message.replaceAll(key, value);
          }
        }
      });

      const arrMessage = JSON.parse(message);
      const strMessage = arrMessage[0].message[0];

      const body = {
        to: mobileNumber,
        message: strMessage,
        channel: inArguments.channel,
        MID,
      };

      console.log('debug-execute body' + MID);
      console.log( JSON.stringify(body));

      // ------- sending message with rate limit start ------
      // empty promise to ignite rate limit queue
      // await limiter(() => new Promise((resolve) => {
      //   resolve();
      // }));

      const data = await api.sendMessage(body);
      // ******** sending message with rate limit end ********

      console.log('debug-send_message response ' + MID, JSON.stringify(data));

      // return res.status(200).json({"foundSignupDate": "2023-10-23"});
      const status = data.data.success == true ? 200 : 500;
      const responseBack = {'success': status == 200 ? 'true' : 'false'};
      console.log('debug-send_message response back ' + MID, JSON.stringify(responseBack));
      return res.status(status).json(responseBack);
    } catch (err) {
      console.error(JSON.stringify(err));
      return res.status(500).json({'success': 'false'});
    }
  },
  updateMessageStatus: async function(messageStatus, wa_message_id) {
    const objMessage = await get_message_by_wa_message_id({wa_message_id}) || {};
    if (objMessage.wa_message_id) {
      objMessage.status[messageStatus] = true;
      objMessage.finalStatus = messageStatus;
      console.log('input to update message status', JSON.stringify(objMessage));
      const data = await store_message(objMessage);

      console.log('response update store message status:', data);
      return data;
    } else {
      console.error('Wa_Message_Id Not Found by wa_message_id:' + objMessage.wa_message_id);
      return {error: true};
    }
  },
  getStatus: (req, res) => {
    try {
      const {data, subscription_type, type} = req.body.event;
      console.log('data', JSON.stringify(data), JSON.stringify({type, subscription_type}));

      let status = ''; let wa_message_id = '';
      if (type == 'UPDATE' && subscription_type == 'livechat') {
        // code to extract rejected status
        status = data.status;
        if (status) {
          wa_message_id = data?.message_uuid;
          if (status == 'rejected' || status == 'reject') {
            status = "failed";
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
        return {};
      }
    } catch (error) {
      console.error('error:', JSON.stringify(error));
      return {};
    }
  },
  jumperCallBack: async (req, res) => {
    console.log('callback init', JSON.stringify(req.body));
    const {status, wa_message_id} = controller.getStatus(req);
    console.log('status:', JSON.stringify({status, wa_message_id}));

    if (status && wa_message_id) {
      const response = await controller.updateMessageStatus(status, wa_message_id);
      console.log('update message status response:', JSON.stringify(response));
      const responseData = response?.data;
      console.log('updateMessageStatus response ', JSON.stringify(responseData));
      if (responseData?.status[0]?.indexUpdates) {
        console.log(`${wa_message_id} successfully status updated as ${status}`);
        return res.json({"status": "success", "message": `Message status updated as "${status}" for message id: ${wa_message_id}`});
      } else {
        console.error(`${wa_message_id} error in status update, status: ${status}, wa_message_id: ${wa_message_id}`);
        return res.json({"status": "error", "message": "failed saving status"});
      }
    }
    console.error(`${wa_message_id} error in status update, status: ${status}, wa_message_id: ${wa_message_id}`);
    return res.json({"status": "error", "message": "failed saving status"});
  },
  onJumperSendMessage: async (req, res) => {
  },
};

module.exports = controller;
