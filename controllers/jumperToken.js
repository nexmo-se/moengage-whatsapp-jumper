const api = require('../utils/api.js');
const {dt_store, dt_get, getUserDetailsBy_UID, getUserDetailsBy_uid_shop_name} = require('../datastore/datastore.js');
const jumperUser = require('./user.js');
const userModel = require('../model/user.js');
const jwt = require('jsonwebtoken');
const util = require('../utils/util.js');

const controller = {
  refreshToken: async (req, res) => {
    try {
      const data = await userModel.refreshToken(req.body);
      res.status(data.status || 500).json(data);
    } catch (error) {
      console.error('error at refreshToken controller', error);
      res.status(500).json({status: 'failed', error: error});
    }
  },
  verifyJumperSavedToken: async (req, res) => {
    const { userId, shopName } = req.body;
    const uid_shop_name = `${userId}_${shopName}`;
    const {status, verified} = await api.verifyJumperSavedToken({uid_shop_name});
    console.log(`verify jumper token init for uid_shop_name: ${uid_shop_name}`);


    if (status) {
      try {
        const is_valid_token = verified == 1;
        let data = await getUserDetailsBy_uid_shop_name(uid_shop_name);
        data = {...data, ...{is_valid_token: is_valid_token, last_updated_date: util.currentUtcTime()}};
        await dt_store({kind: 'MOENGAGE_CONF', key: uid_shop_name, data});
        console.log(`verify jumper token succeed for uid_shop_name: ${uid_shop_name}`);
      } catch (error) {
        console.log(`verify jumper token failed for uid_shop_name: ${uid_shop_name}`);
        return res.status(500).json(error);
      }
    }

    return res.status(status || 500).json({verified});
  },
  verifyToken: async (req, res) => {
    try {
      const { token } = req.body;
      const {status, data} = await api.fetchWaTemplates(10, { token });
      const validToken = data.data && !!data.data.length;
      return res.status(status || 500).json({validToken});
    } catch (error) {
      console.error(error);
      return res.status(500).json({error});
    }
  },
  refreshAllToken: async (req, res) => {
    try {
      const data = await userModel.refreshAllToken();
      return res.status(200).json({status: 'success', data});
    } catch (error) {
      return res.status(500).json({status: 'failed', error});
    }
  },
  generateToken: async (req, res) => {
    try {
      console.log(process.env.TOKEN_KEY);
      const { userId, shopName: token } = req.body;
      let data = {
          time: Date(),
          userId: userId,
      } 
      const generatedToken = jwt.sign(data, process.env.TOKEN_KEY);
      res.status(200).send({token: generatedToken});
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: JSON.stringify(error) });
    }
  },

};

module.exports = controller;
