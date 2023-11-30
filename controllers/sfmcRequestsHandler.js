require('dotenv').config();
const jumperMessage = require('./jumperMessage');
const sfmcConfig = require('../../ui/dist/config.json');

const controller = {
  status: (req, res) => {
    console.log('status request called');
    res.status(200).send({data: 'Wordly Hello'});
  },
  save: (req, res) => {
    console.log('save request called', JSON.stringify(req.body));
    res.status(200).send({status: true});
  },
  publish: (req, res) => {
    console.log('publish request called', JSON.stringify(req.body));
    res.status(200).send({status: true});
  },

  validate: (req, res) => {
    console.log('validate request  called', JSON.stringify(req.body));
    res.status(200).send({status: true});
  },
  stop: (req, res) => {
    console.log('stop request called', JSON.stringify(req.body));
    res.status(200).send({status: true});
  },
  execute: async (req, res) => {
    console.log('execute request called', JSON.stringify(req.body));
    const inArguments = req.body.inArguments[0];
    if (inArguments.channel == 'sms') {
      return await jumperMessage.sendTextMessage(req, res, inArguments);
    } else {
      return await jumperMessage.sendWhatsAppMessage(req, res, req.body);
    }
  },
  config: async (req, res) => {
    const baseUrl = `${process.env.ROOT_URL}/${req.params.shopName}`;
    sfmcConfig.name = `Conversational Commerce (${req.params.shopName})`;
    sfmcConfig.lang['en-US'].name = `Conversational Commerce (${req.params.shopName})`;
    sfmcConfig.arguments.execute.url = `${baseUrl}/execute`;
    sfmcConfig.configurationArguments.save.url = `${baseUrl}/save`;
    sfmcConfig.configurationArguments.publish.url = `${baseUrl}/publish`;
    sfmcConfig.configurationArguments.validate.url = `${baseUrl}/validate`;
    sfmcConfig.configurationArguments.stop.url = `${baseUrl}/stop`;
    res.status(200).send(sfmcConfig);
  },
};

module.exports = controller;
