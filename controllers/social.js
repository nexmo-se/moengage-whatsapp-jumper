const {fetchChannels, getJumperToken} = require('../utils/api');
const socialModel = require('../model/social.js');

const controller = {
  getSocialChannels: async (req, res) => {
    try {
      console.log("****", req.query.userId);
      const uid_shop_name = `${req.query.userId}_${req.query.shopName}`;
      const jumperToken = await getJumperToken({uid_shop_name});
      console.log(jumperToken);
      const response = await socialModel.getSocialChannels(jumperToken);
      res.status(200).json({status: 'success', data: response});
    } catch (error) {
      console.error('error at getSocialChannels controller', error);
      res.status(500).json({status: 'failed', error: error});
    }
  },
};

module.exports = controller;