const {Datastore} = require('@google-cloud/datastore');
const {PreciseDate} = require('@google-cloud/precise-date');
const util = require('../utils/util');

const datastoreDetails = {
  projectId: process.env.DT_PROJECT_ID,
};

// code to connect from local
if (process.env.DT_JSON_PATH) {
  datastoreDetails.keyFilename = process.env.DT_JSON_PATH;
}

const datastore = new Datastore(datastoreDetails);


// The kind for the new entity
// const kind = process.env.DT_KIND;


const dt_store = async ({kind, key, data}) => {
  const maxTries = 5;

  const tryRequest = async ({kind, key, data, currentAttempt, delay}) => {
    try {
      const taskKey = datastore.key([kind, key]);
      const task = {
        key: taskKey,
        data: data,
      };
      return await datastore.save(task);
    } catch (err) {
      if (currentAttempt <= maxTries) {
        // Use exponential backoff
        setTimeout(async () => {
          return await tryRequest(currentAttempt + 1, delay * 2);
        }, delay);
      }
      throw err;
    }
  };

  return tryRequest( {kind, key, data, currentAttempt: 1, delay: 3000});
};

const dt_get = async ({kind, key}) => {
  const maxTries = 5;

  const tryRequest = async ({kind, key, currentAttempt, delay}) => {
    try {
      const taskKey = datastore.key([kind, key]);
      const data = await datastore.get(taskKey);
      return data;
    } catch (err) {
      if (currentAttempt <= maxTries) {
        // Use exponential backoff
        setTimeout(async () => {
          return await tryRequest(currentAttempt + 1, delay * 2);
        }, delay);
      }
      throw err;
    }
  };

  return tryRequest( {kind, key, currentAttempt: 1, delay: 3000});
};

const getUserDetailsBy_UID = async (uid) => {
  const data = await dt_get({kind: 'MOENGAGE_CONF', key: user_uid});
  if (data && data.length && data[0]) {
    return data[0];
  }
};

const getUserDetailsBy_uid_shop_name = async (uid_shop_name) => {
  const data = await dt_get({kind: 'MOENGAGE_CONF', key: uid_shop_name});
  if (data && data.length && data[0]) {
    return data[0];
  }
};

// const getUserSDetails = async (MID) => {
//   const data = await dt_get({kind: 'MOENGAGE_CONF'});
//   return data;
//   // if (data && data.length && data[0]) {
//   //   return data[0];
//   // }
// };

const getUsersToUpdateToken = async () => {
  // const data = await dt_get({kind: 'MOENGAGE_CONF'});
  // console.log(data);
  let threeWeeks = new Date();
  threeWeeks.setDate(threeWeeks.getDate() + 21);
  threeWeeks = util.dateTimeIso(threeWeeks);
  // 2023-11-28T18:29:34.141Z

  console.log(threeWeeks);
  const users = datastore.createQuery('MOENGAGE_CONF');
  const query = users.filter('token_expiry_time', '<', threeWeeks);
  const data = await datastore.runQuery(query);
  // console.log(data);
  return data;
};

const getUsersByToken = async (token) => {
  const queryMessages = datastore.createQuery('MOENGAGE_CONF');
  const query = await queryMessages.filter('token', token);
  const data = await datastore.runQuery(query);
  return data;
};

const currentDateTimeIso = function() {
  const date = new PreciseDate();
  return date.toISOString();
};

const getAuthToken = async () => {
  const data = await dt_get({kind:'MOENGAGE_CONF', key: 'auth_token'});
  if (data && data.length && data[0]) {
    return data[0].value;
  }
};

const getRefreshToken = async () => {
  const data = await dt_get({kind:'MOENGAGE_CONF', key: 'refresh_token'});
  if (data && data.length && data[0]) {
    return data[0].value;
  }
};

const get_templates = async () => {
  const data = await dt_get({kind:'MOENGAGE_CONF', key: 'templates'});
  if (data && data.length && data[0]) {
    return data[0].value;
  }
};

const get_templates_by_uid_shop_name = async ({ uid_shop_name }) => {
  const data = await dt_get({kind:'MOENGAGE_WA_TEMPLATES', key: `${uid_shop_name}`});
  if (data && data.length && data[0]) {
    return data[0].value;
  }
};

const get_wa_id = async () => {
  const data = await dt_get({ kind: 'MOENGAGE_CONF', key: 'whatsapp_id' });
  if (data && data.length && data[0]) {
    return data[0].value;
  }
};

const get_message_by_conv_id = async ({ wa_conv_id }) => {
  const queryMOengageMessages = datastore.createQuery('MOENGAGE_MESSAGES');
  const query = await queryMOengageMessages.filter('wa_conv_id', wa_conv_id)
  const data = await datastore.runQuery(query);
  console.log('fetch data by wa wa_conv_id', wa_conv_id);
  console.log(JSON.stringify(data))
  if (data && data.length && data[0] && data[0][0]) {
    return data[0][0];
  }
};

const get_message_by_wa_message_id = async ({ wa_message_id }) => {
  const queryMOengageMessages = datastore.createQuery('MOENGAGE_MESSAGES');
  const query = await queryMOengageMessages.filter('wa_message_id', wa_message_id);
  const data = await datastore.runQuery(query);
  console.log('fetch data by wa message id', wa_message_id);
  console.log(JSON.stringify(data))
  if (data && data.length && data[0] && data[0][0]) {
    return data[0][0];
  }
};

const get_whitelist = async () => {
  const data = await dt_get({kind:'MOENGAGE_CONF', key: 'whitelist'});
  if (data && data.length && data[0]) {
    return data[0];
  }
};

const store_auth_token = async ({auth_token}) => {
  const data = {
    value: auth_token,
    last_updated: currentDateTimeIso()
  }
  return await dt_store({kind: 'MOENGAGE_CONF', key:'auth_token', data});
};

const store_refresh_token = async ({refresh_token}) => {
  const data = {
    value: refresh_token,
    last_updated: currentDateTimeIso()
  }
  return await dt_store({kind: 'MOENGAGE_CONF', key:'refresh_token', data});
};

const store_templates = async ({ templates }) => {
  const data = {
    value: templates,
    last_updated: currentDateTimeIso(),
  }
  return await dt_store({kind: 'MOENGAGE_CONF', key:'templates', data});
};

const store_templates_by_uid_shop_name = async ({ templates, uid_shop_name }) => {
  const data = {
    value: templates,
    last_updated: currentDateTimeIso(),
  }
  return await dt_store({kind: 'MOENGAGE_WA_TEMPLATES', key:`${uid_shop_name}`, data});
};

const store_wa_id = async ({whatsapp_id}) => {
  const data = {
    value: whatsapp_id,
    last_updated: currentDateTimeIso(),
  }
  return await dt_store({kind: 'MOENGAGE_CONF', key:'whatsapp_id', data});
};

const store_message = async ({ mo_msg_id, mo_waba_number, mo_template_id, wa_message_id, wa_conv_id, campaign_id, uid_shop_name, receiver_number, final_status, status }) => {
  const data = {
    mo_msg_id,
    mo_waba_number,
    mo_template_id,
    wa_message_id,
    wa_conv_id,
    created_date: currentDateTimeIso(),
    campaign_id,
    uid_shop_name,
    receiver_number,
    final_status: final_status || "-",
    status: status || {}
  }
  console.log(JSON.stringify(data));
  return await dt_store({kind: 'MOENGAGE_MESSAGES', key:wa_message_id, data});
};


// module.exports = {dt_store, dt_get, getUserDetailsBy_UID, getUsersToUpdateToken, get_message_by_wa_message_id, store_message, getUsersByToken};
module.exports = {dt_store, dt_get, getUserDetailsBy_UID, getUserDetailsBy_uid_shop_name, getUsersToUpdateToken, getAuthToken, getUsersByToken, getRefreshToken, get_templates, get_templates_by_uid_shop_name, get_wa_id, store_auth_token, store_refresh_token, store_templates, store_templates_by_uid_shop_name, store_message, store_wa_id, get_whitelist, get_message_by_conv_id, get_message_by_wa_message_id};


