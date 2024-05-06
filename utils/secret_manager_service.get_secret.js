
'use strict';

async function accessSecret() {
  const {SecretManagerServiceClient} = require('@google-cloud/secret-manager').v1;
  const client = new SecretManagerServiceClient();

  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.DT_PROJECT_ID}/secrets/JUMPER_SECRET_KEY/versions/latest`,
  });
  const payload = version.payload.data.toString('utf8');
  process.env.JUMPER_SECRET_KEY = payload;

  // const [reponse] = await client.accessSecretVersion({
  //   name: `projects/${process.env.DT_PROJECT_ID}/secrets/MOENGAGE_SECRET_KEY/versions/latest`,
  // });
  // const MOENGAGE_SECRET_KEY = reponse.payload.data.toString('utf8');
  // process.env.MOENGAGE_SECRET_KEY = MOENGAGE_SECRET_KEY;
  process.env.MOENGAGE_SECRET_KEY = process.env.TOKEN_KEY;
}

module.exports = {accessSecret};