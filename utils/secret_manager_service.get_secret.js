
'use strict';

async function accessSecret() {
  const {SecretManagerServiceClient} = require('@google-cloud/secret-manager').v1;
  const client = new SecretManagerServiceClient();

  const [version] = await client.accessSecretVersion({
    name: 'projects/jumperdevnew/secrets/JUMPER_SECRET_KEY/versions/latest',
  });
  const payload = version.payload.data.toString('utf8');
  process.env.JUMPER_SECRET_KEY = payload;

  const [reponse] = await client.accessSecretVersion({
    name: 'projects/jumperdevnew/secrets/MOENGAGE_SECRET_KEY/versions/latest',
  });
  const MOENGAGE_SECRET_KEY = reponse.payload.data.toString('utf8');
  process.env.MOENGAGE_SECRET_KEY = MOENGAGE_SECRET_KEY;
}

module.exports = {accessSecret};