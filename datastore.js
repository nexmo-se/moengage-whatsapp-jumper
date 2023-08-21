const { Datastore } = require('@google-cloud/datastore');
const {PreciseDate} = require('@google-cloud/precise-date');

const datastoreDetails = {
  projectId: process.env.DT_PROJECT_ID,
};

// code to connect from local
if (process.env.DT_JSON_PATH) {
  datastoreDetails.keyFilename = process.env.DT_JSON_PATH;
}

const datastore = new Datastore(datastoreDetails);
const queryMOengageMessages = datastore.createQuery('MOENGAGE_MESSAGES');


// The kind for the new entity
// const kind = process.env.DT_KIND;


const dt_store = async ({ kind, key, data }) => {
  const taskKey = datastore.key([kind, key]);
  const task = {
    key: taskKey,
    data: data,
  };
  await datastore.save(task);
};

const dt_get = async ({kind, key}) => {
  const taskKey = datastore.key([kind, key]);
  const data = await datastore.get(taskKey);
  return data;
};

function currentDateTimeIso() {
  const date = new PreciseDate();
  return date.toISOString();
}

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

const get_wa_id = async () => {
  const data = await dt_get({ kind: 'MOENGAGE_CONF', key: 'whatsapp_id' });
  if (data && data.length && data[0]) {
    return data[0].value;
  }
};

const get_message_by_conv_id = async ({ wa_conv_id }) => {
  const data = await queryMOengageMessages.filter('wa_conv_id', wa_conv_id)
  if (data && data.length && data[0]) {
    return data[0];
  }
};

const get_message_by_wa_message_id = async ({wa_message_id}) => {
  const data = await dt_get({ kind: 'MOENGAGE_MESSAGES', key: wa_message_id });
  if (data && data.length && data[0]) {
    return data[0];
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

const store_wa_id = async ({whatsapp_id}) => {
  const data = {
    value: whatsapp_id,
    last_updated: currentDateTimeIso(),
  }
  return await dt_store({kind: 'MOENGAGE_CONF', key:'whatsapp_id', data});
};

const store_message = async ({ mo_msg_id, mo_waba_number, mo_template_id, wa_message_id, wa_conv_id, campaign_id }) => {
  const data = {
    mo_msg_id,
    mo_waba_number,
    mo_template_id,
    wa_message_id,
    wa_conv_id,
    created_date: currentDateTimeIso(),
    campaign_id,
  }
  console.log(JSON.stringify(data));
  return await dt_store({kind: 'MOENGAGE_MESSAGES', key:wa_message_id, data});
};

module.exports = {dt_store, dt_get, getAuthToken, getRefreshToken, get_templates, get_wa_id, store_auth_token, store_refresh_token, store_templates, store_message, store_wa_id, get_whitelist, get_message_by_conv_id, get_message_by_wa_message_id};

