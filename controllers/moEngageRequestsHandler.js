require('dotenv').config();
const jumperMessage = require('./jumperMessage');

const controller = {
  status: (req, res) => {
    console.log('status request called');
    res.status(200).send({data: 'Working fine'});
  },
  execute: async (req, res) => {
    console.log('execute request called', JSON.stringify(req.body));
    return await jumperMessage.sendWhatsAppMessage(req, res, req.body);
  }
};

module.exports = controller;
