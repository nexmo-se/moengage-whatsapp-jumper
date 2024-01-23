const api = require('../utils/api');
const util = require('../utils/util');

const controller = {
  channels: async (req, res) => {
    const objAuth = util.getReqToken(req);
    const data = await api.fetchChannels(objAuth);
    res.status(200).json(data);
  },
  fetchWaTemplates: async (req, res) => {
    console.log('fetchTemplates');
    const limit = req && req.query && req.query.limit || 'all';
    const {status, data} = await api.fetchWaTemplates(limit, {token: req.jumperToken});
    res.status(status || 500).json(data);
  },
  fetchWaTemplate: async (req, res) => {
    const data = await api.fetchWaTemplate(req.query.id, {token: req.jumperToken});
    res.status(200).json(data);
  },
};

module.exports = controller;
