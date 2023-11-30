const api = require('../api.js');
const {dt_store, getUserDetailsBy_MID} = require('../datastore/datastore.js');
const jumperUser = require('./user.js');
const userModel = require('../model/user.js');

const controller = {
  refreshToken: async (req, res) => {
    try {
      const data = await userModel.refresh_token(req.body);
      res.status(data.status || 500).json(data);
    } catch (error) {
      console.error('error at refreshToken controller', error);
      res.status(500).json({status: 'failed', error: error});
    }
  },
  verifyJumperSavedToken: async (req, res) => {
    const MID = `${req.body.MID}_${req.params.shopName}`;
    const {status, verified} = await api.verifyJumperSavedToken({MID});
    console.log(`verify jumper token init for MID: ${MID}`);


    if (status) {
      try {
        const is_valid_token = verified == 1;
        let data = await getUserDetailsBy_MID(MID);
        data = {...data, ...{is_valid_token: is_valid_token}};
        await dt_store({kind: 'SFMC_CONF', key: MID, data});
        console.log(`verify jumper token succeed for MID: ${MID}`);
      } catch (error) {
        console.log(`verify jumper token failed for MID: ${MID}`);
        return res.status(500).json(error);
      }
    }

    return res.status(status || 500).json({verified});
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
      const { userId, token } = req.body; 
      let data = {
          time: Date(),
          userId: userId,
      } 
      const generatedToken = jwt.sign(data, token);
      res.status(200).send({token: generatedToken});
    } catch (error) {
      res.status(500).send({ error: JSON.stringify(error) });
    }
  }

};

module.exports = controller;
