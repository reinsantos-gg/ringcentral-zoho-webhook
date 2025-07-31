require('dotenv').config();
const axios = require('axios');
const qs = require('qs');

// Use .env variables for security
const clientId = process.env.RINGCENTRAL_CLIENT_ID;
const clientSecret = process.env.RINGCENTRAL_CLIENT_SECRET;
const jwt = process.env.RINGCENTRAL_JWT;

const data = qs.stringify({
  grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
  assertion: jwt,
});

const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

axios
  .post('https://platform.ringcentral.com/restapi/oauth/token', data, {
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  .then((res) => {
    const token = res.data.access_token;
    const expiresIn = res.data.expires_in;

    console.log('✅ Access Token:', token);
    console.log(`⏳ Expires in: ${expiresIn / 60} minutes`);
  })
  .catch((err) => {
    console.error('❌ Error:', err.response?.data || err.message);
  });
