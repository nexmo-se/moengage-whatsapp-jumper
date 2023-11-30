const {dt_store, dt_get, getUsersToUpdateToken, getUsersByToken} = require('../datastore/datastore.js');
const util = require('../utils/util');
const api = require('../api');

const model = {
  refreshAllToken: async (res, response) => {
    const [users] = await getUsersToUpdateToken();
    console.log("Users whose token is about to expire in 2 weeks", JSON.stringify(users));
    const uniqueUsers = {};
    users.forEach( async (user) => {
      if (user.refresh_token) {
        if (!uniqueUsers[user.client_key]) {
          uniqueUsers[user.client_key] = {...user};
        }
      }
    });
    const updatedUserArray = [];
    const keys = Object.keys(uniqueUsers);
    for (let i=0; i< keys.length; i++) {
      const user_client_key = keys[i];
      const {token, refresh_token, client_key, secret_key} = uniqueUsers[user_client_key];
      const updatedUsers = await model.refreshToken({token, refresh_token, client_key, secret_key});
      updatedUserArray.push(updatedUsers);
    }
    console.log('Token refreshed for', JSON.stringify(updatedUserArray));
    return updatedUserArray;
  },
  refreshToken: async ({token, refresh_token, client_key, secret_key}) => {
    if (token && refresh_token && client_key && secret_key) {
      console.log(client_key + ` refresh token init for ${ JSON.stringify({token, refresh_token, client_key, secret_key}) }`);
      const data = await api.refreshToken({token, refresh_token, client_key, secret_key});
      console.log(client_key + ' refresh token response', JSON.stringify(data));
      if (data.access_token) {
        const response = await model.updateUserTokenByKey({updated_token: data.access_token, updated_refresh_token: data.refresh_token, old_token: token, expires_in: data.expires_in});
        console.log('refreshed token response: ', JSON.stringify(response));
        return response;
      } else {
        return {refreshTokenError: 'Token is not refreshed due to invalid refresh token', data};
      }
    }
    return {refreshTokenError: 'Token is not refreshed due to invalid refresh token'};
  },
  updateUserTokenByKey: async ({updated_token, updated_refresh_token, old_token, expires_in}) => {
    const [users] = await getUsersByToken(old_token);
    const usersUpdatedTokens = [];
    for (let i=0; i < users.length; i++) {
      const user = users[i];
      if (user.MID_SHOP_NAME) {
        user.refresh_token = updated_refresh_token;
        user.token = updated_token;
        user.token_expiry_time = util.getDateForExpirySeconds(expires_in);
        await dt_store({kind: 'SFMC_CONF', key: user.MID_SHOP_NAME, data: user});
        console.log( user.client_key + ' updated conf for client key: ', user.client_key );
        usersUpdatedTokens.push({client_key: user.client_key, MID_SHOP_NAME: user.MID_SHOP_NAME});
      }
    }
    return usersUpdatedTokens;
  },
};

module.exports = model;
