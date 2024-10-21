require('dotenv').config();
const express = require('express');
const app = express();
const server = require('http').createServer();
const port = process.env.PORT || 3001;
var morgan = require('morgan')
var timeout = require('connect-timeout')
const { get_wa_id, store_wa_id} = require('../datastore');
const cors = require('cors');
const {accessSecret} = require('../utils/secret_manager_service.get_secret');

if(process.env.IS_LOCAL != 'true') {
  accessSecret();
}

var whatsapp_id = null


app.use(timeout(process.env.RESPONSE_TIMEOUT || "30s"))
app.use(morgan('combined'))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(require('../router'));

if (process.env.ENVIRONMENT == "STAGING") {
  app.use('/moengage', require('../router'));
} else {
  app.use(require('../router'));
}

app.get('/', (req, res) => {
  res.json(200);
});

server.on('request', app)

server.listen(port, async () => {
  console.log(`Starting server at port: ${port}`)
  // whatsapp_id = await dt_get("whatsapp_id")
  whatsapp_id = await get_wa_id();
  if(whatsapp_id == null){
    console.log("No WA ID found, getting from env and storing it", process.env.WA_ID)
    // await dt_store("whatsapp_id", process.env.WA_ID)
    await store_wa_id({ whatsapp_id: process.env.WA_ID})
  }

});

// const localtunnel = require('localtunnel');
// (async () => {
//   const tunnel = await localtunnel({
//     subdomain: "bjtestvonage01",
//     port: 3000
//   });
//   console.log(`App available at: ${tunnel.url}`);
// })()
