const {dt_store, dt_get, getUserDetailsBy_UID, getUserDetailsBy_uid_shop_name} = require('../datastore/datastore.js');
const util = require('../utils/util');
const userModel = require('../model/user.js');

const controller = {
  newUser: async (req, res) => {
    try {
      const {user_uid, shop_name, token, refresh_token, client_key, secret_key, is_valid_token, mo_engage_jumper_app_token, dlr_web_hook_url, sender_name, wa_business_number} = req.body;
      const uid_shop_name = `${user_uid}_${shop_name}`;
      console.log('>>> new user', uid_shop_name);

      if (!user_uid) {
        return res.sendStatus(400);
      }
      // console.log({kind: 'MOENGAGE_CONF', key: uid_shop_name, data: {uid_shop_name, token, refresh_token, client_key, secret_key, is_valid_token, token_expiry_time: util.dateTimeIso()}});
      await dt_store({kind: 'MOENGAGE_CONF', key: uid_shop_name, data: {uid_shop_name, user_uid, shop_name, token, refresh_token, mo_engage_jumper_app_token, client_key, secret_key, is_valid_token, dlr_web_hook_url, sender_name, wa_business_number, token_expiry_time: util.dateTimeIso(), last_updated_date: util.currentUtcTime()}});
      const updateTokenForUser = await userModel.refreshToken({token, refresh_token, client_key, secret_key});
      res.status(200).json({status: 'success', updateTokenForUser});
      // res.status(200).json({status: 'success'});
    } catch (error) {
      console.error('error at newUser controller', error);
      res.status(500).json({status: 'failed', error: error});
    }
  },
  user: async (req, res) => {
    const uid_shop_name = `${req.query.userId}_${req.query.shopName}`;
    console.log(uid_shop_name);
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
