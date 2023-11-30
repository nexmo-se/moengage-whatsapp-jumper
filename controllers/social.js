const {fetchChannels} = require('../api');

const controller = {
  getSocialChannels: async (req, res) => {
    try {
      const MID = `${req.body.MID}_${req.params.shopName}`;
      const body = {MID};
      const response = await fetchChannels(body);
      res.status(200).json({status: 'success', data: response});
    } catch (error) {
      console.error('error at getSocialChannels controller', error);
      res.status(500).json({status: 'failed', error: error});
    }
  },
};

module.exports = controller;