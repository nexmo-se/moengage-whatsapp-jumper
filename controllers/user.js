const {dt_store, dt_get, getUserDetailsBy_UID, getUserDetailsBy_uid_shop_name} = require('../datastore/datastore.js');
const util = require('../utils/util');
const userModel = require('../model/user.js');
const api = require('../utils/api');

const controller = {
  newUser: async (req, res) => {
    try {
      const { shop_name, token, refresh_token, client_key, secret_key, is_valid_token, mo_engage_jumper_app_token, dlr_web_hook_url, sender_name, wa_business_number} = req.body;
      console.log("new user", JSON.stringify(req.body));
      const user_uid = req.userId;
      const uid_shop_name = `${user_uid}_${shop_name}`;
      console.log('new user uid_shop_name', uid_shop_name);

      // validate details
      const {tokenValid, refreshTokenValid, clientKeyValid} = await userModel.verifyTokenDetails({token, refresh_token, client_key});
      if(!tokenValid || !refreshTokenValid || !clientKeyValid) {
        res.status(200).json({status: 'success', validation: {tokenValid, refreshTokenValid, clientKeyValid} });
        return;
      }

      if (!user_uid) {
        return res.sendStatus(400);
      }

      const data = await api.refreshToken({token, refresh_token, client_key, secret_key});
      console.log(client_key + ' refresh token response', JSON.stringify(data));
      if (data?.access_token) {
        // {updated_token: data.access_token, updated_refresh_token: data.refresh_token, old_token: token, expires_in: data.expires_in}
        const expiresIn = util.getDateForExpirySeconds(data.expires_in);
        await dt_store({kind: 'MOENGAGE_CONF', key: uid_shop_name, data: {uid_shop_name, user_uid, shop_name, token: data.access_token, refresh_token: data.refresh_token, mo_engage_jumper_app_token, client_key, secret_key, is_valid_token, dlr_web_hook_url, sender_name, wa_business_number, token_expiry_time: expiresIn, last_updated_date: util.currentUtcTime()}});
        res.status(200).json({status: 'success', data});
      } else {
        res.status(200).json({status: 'success', data: {refreshTokenError: 'Token is not refreshed due to invalid refresh token', data}});
        return
      }
      // console.log({kind: 'MOENGAGE_CONF', key: uid_shop_name, data: {uid_shop_name, token, refresh_token, client_key, secret_key, is_valid_token, token_expiry_time: util.dateTimeIso()}});
      // const updateTokenForUser = await userModel.refreshToken({token, refresh_token, client_key, secret_key});
      // res.status(200).json({status: 'success', data: updateTokenForUser});
      // res.status(200).json({status: 'success'});
    } catch (error) {
      console.error('error at newUser controller', error);
      res.status(500).json({status: 'failed', error: error});
    }
  },
  user: async (req, res) => {
    const uid_shop_name = `${req.userId}_${req.shopName}`;
    console.log("uid_shop_name", uid_shop_name);
    try {
      const data = await getUserDetailsBy_uid_shop_name(uid_shop_name);
      if (data) {
        return res.status(200).json(data);
      } else {
        console.error('No user found for uid:' + uid_shop_name);
        return res.status(404).json('No user found');
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json(error);
    }
  },
};

module.exports = controller;
