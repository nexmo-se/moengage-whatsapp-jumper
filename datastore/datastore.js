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

const getUserDetailsBy_MID = async (MID) => {
  const data = await dt_get({kind: 'SFMC_CONF', key: MID.toString()});
  if (data && data.length && data[0]) {
    return data[0];
  }
};

// const getUserSDetails = async (MID) => {
//   const data = await dt_get({kind: 'SFMC_CONF'});
//   return data;
//   // if (data && data.length && data[0]) {
//   //   return data[0];
//   // }
// };

const getUsersToUpdateToken = async () => {
  // const data = await dt_get({kind: 'SFMC_CONF'});
  // console.log(data);
  let threeWeeks = new Date();
  threeWeeks.setDate(threeWeeks.getDate() + 21);
  threeWeeks = util.dateTimeIso(threeWeeks);
  // 2023-11-28T18:29:34.141Z

  console.log(threeWeeks);
  const users = datastore.createQuery('SFMC_CONF');
  const query = users.filter('token_expiry_time', '<', threeWeeks);
  const data = await datastore.runQuery(query);
  // console.log(data);
  return data;
};

const getUsersByToken = async (token) => {
  const queryMessages = datastore.createQuery('SFMC_CONF');
  const query = await queryMessages.filter('token', token);
  const data = await datastore.runQuery(query);
  return data;
};

const get_message_by_wa_message_id = async ({wa_message_id}) => {
  const queryMessages = datastore.createQuery('SFMC_MESSAGES');
  const query = await queryMessages.filter('wa_message_id', wa_message_id);
  const data = await datastore.runQuery(query);
  console.log('fetch data by wa message id', wa_message_id);
  console.log(JSON.stringify(data));
  if (data && data.length && data[0] && data[0][0]) {
    return data[0][0];
  }
};

const currentDateTimeIso = function() {
  const date = new PreciseDate();
  return date.toISOString();
};

const store_message = async ({MID, shopName, wa_message_id, wa_conv_id, wa_template_id, sent_to, definitionInstanceId, journeyId, activityId, activityInstanceId, activityObjectID, status, errorMessage, finalStatus}) => {
  const data = {
    MID,
    shopName,
    wa_message_id,
    wa_conv_id,
    wa_template_id,
    sent_to,
    definitionInstanceId,
    journeyId,
    activityId,
    activityInstanceId,
    activityObjectID,
    created_date: currentDateTimeIso(),
    status: status,
    errorMessage: errorMessage,
    finalStatus,
  };
  console.log('store message', JSON.stringify(data));
  return await dt_store({kind: 'SFMC_MESSAGES', key: wa_message_id, data});
};

module.exports = {dt_store, dt_get, getUserDetailsBy_MID, getUsersToUpdateToken, get_message_by_wa_message_id, store_message, getUsersByToken};

