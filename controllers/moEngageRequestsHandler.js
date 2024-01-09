require('dotenv').config();
const jumperMessage = require('./jumperMessage');
const {addTask} = require('./http_task_que')

const controller = {
  status: (req, res) => {
    console.log('status request called');
    res.status(200).send({data: 'Working fine'});
  },
  sendMessage: async (req, res) => {
    console.log('sendMessage request called', JSON.stringify(req.body));
    return await jumperMessage.sendWhatsAppMessage(req, res, req.body);
  },
  sendWhatsapp: async (req, res) => {
    const project = process.env.DT_PROJECT_ID;
    const queue = process.env.QUEUE_NAME;
    const location = process.env.QUEUE_LOCATION;
    const payload = JSON.stringify(req.body);

    try {
      await addTask(project, queue, location, payload);
      res.status(200).send({status: "success"});
    } catch (error) {
      console.error(error);
      res.status(500).send({message: error});
    }
  }
};

module.exports = controller;
