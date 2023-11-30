const {dt_store, dt_get, getUserDetailsBy_MID} = require('../datastore/datastore.js');
const util = require('../utils/util');
const userModel = require('../model/user.js');

const controller = {
  newUser: async (req, res) => {
    try {
      const {user_uid, token, refresh_token, client_key, secret_key, is_valid_token} = req.body;
      const MID_SHOP_NAME = `${user_uid}_${req.params.shopName}`;
      console.log('>>> new user', MID_SHOP_NAME);

      if (!user_uid) {
        return res.sendStatus(400);
      }
      // console.log({kind: 'SFMC_CONF', key: MID_SHOP_NAME, data: {MID_SHOP_NAME, token, refresh_token, client_key, secret_key, is_valid_token, token_expiry_time: util.dateTimeIso()}});
      await dt_store({kind: 'SFMC_CONF', key: MID_SHOP_NAME, data: {MID_SHOP_NAME, token, refresh_token, client_key, secret_key, is_valid_token, token_expiry_time: util.dateTimeIso()}});
      const updateTokenForUser = await userModel.refreshToken({token, refresh_token, client_key, secret_key});
      res.status(200).json({status: 'success', updateTokenForUser});
      // res.status(200).json({status: 'success'});
    } catch (error) {
      console.error('error at newUser controller', error);
      res.status(500).json({status: 'failed', error: error});
    }
  },
  user: async (req, res) => {
    const {user_uid} = req.query;
    const MID_SHOP_NAME = `${user_uid}_${req.params.shopName}`;
    try {
      const data = await getUserDetailsBy_MID(MID_SHOP_NAME);
      if (data) {
        return res.status(200).json(data);
      } else {
        console.error('No user found for MID:' + MID_SHOP_NAME);
        return res.status(404).json('No user found');
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json(error);
    }
  },
};

module.exports = controller;
