const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// 🔐 Zoho OAuth credentials
let zohoAccessToken = '1000.a16933bf47df33bc49e4bc7b2975a77d.f2d1d079d636090f6508341741f2e05b';
const zohoRefreshToken = '1000.5527d7c7de0b9dc1988cb463aa460fcf.1a7fcfa8bbf755f97009b53cb87ca0f1';
const clientId = '1000.IFK0TXUBUJ58BRK8OTDM4BM70BX5CJ';
const clientSecret = '2ef151593c631db8e24ac99a7497fa8156bd2c8367';
const redirectUri = 'http://localhost:3000/oauth';

// 🔄 Refresh Zoho Access Token
async function refreshZohoAccessToken() {
  try {
    const res = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        refresh_token: zohoRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }
    });
    zohoAccessToken = res.data.access_token;
    console.log('🔄 New Access Token:', zohoAccessToken);
    return zohoAccessToken;
  } catch (err) {
    console.error('❌ Refresh Token Error:', err.response?.data || err.message);
    throw err;
  }
}

// 🔁 Handle Zoho OAuth Redirect
app.get('/oauth', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code provided');

  try {
    const tokenRes = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      }
    });

    console.log('✅ Zoho Access Token:', tokenRes.data.access_token);
    console.log('🔁 Zoho Refresh Token:', tokenRes.data.refresh_token);

    res.send('✅ Authorization complete. Check terminal for tokens.');
  } catch (err) {
    console.error('❌ Token Exchange Error:', err.response?.data || err.message);
    res.status(500).send('Error exchanging code for token');
  }
});

// 📞 Webhook Receiver (RingCentral calls this)
app.post('/webhook', async (req, res) => {
  const data = req.body;
  console.log('📞 Webhook Received:', JSON.stringify(data, null, 2));

  const caller = data.body?.activeCalls?.[0]?.from?.phoneNumber;
  if (!caller) {
    console.log('❌ No caller number received.');
    return res.status(400).send('No phone number found');
  }

  console.log(`📞 Incoming call from: ${caller}`);

  try {
    const contact = await getZohoContactByPhone(caller);
    if (contact) {
      console.log(`✅ Zoho Contact Found: ${contact.firstName} ${contact.lastName} (${contact.email})`);
    } else {
      console.log('❌ No contact found in Zoho Desk.');
    }
  } catch (error) {
    console.error('❌ Zoho API Error:', error.message || error);
  }

  res.status(200).send('OK');
});

// 🔍 Get contact with automatic token refresh
async function getZohoContactByPhone(phone) {
  try {
    return await fetchContact(phone);
  } catch (error) {
    if (error.response?.data?.errorCode === 'INVALID_OAUTH') {
      console.warn('🔁 Token expired. Attempting to refresh...');
      await refreshZohoAccessToken();
      return await fetchContact(phone);
    } else {
      throw error;
    }
  }
}

// 🔍 Fetch Zoho contact using access token
async function fetchContact(phone) {
  const response = await axios.get('https://desk.zoho.com/api/v1/contacts/search', {
    headers: {
      Authorization: `Zoho-oauthtoken ${zohoAccessToken}`
    },
    params: {
      phone: phone
    }
  });

  return response.data.data?.[0] || null;
}

// 🖥️ Start server
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
