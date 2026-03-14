const router = require('express').Router();
const axios = require('axios');
const { google } = require('googleapis');
const { requireAuth, attachUser } = require('../middleware/auth');
const { storeGoogleToken } = require('../services/tokenService');
const { getClientById } = require('../services/clientService');
const db = require('../db');
const logger = require('../utils/logger');

// Google OAuth scopes: GBP + GA4 + Search Console in one consent flow
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'openid',
  'email',
];

const buildOAuth2Client = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

// ─── Auth0 routes ────────────────────────────────────────────────────────────

// GET /api/auth/me — returns current user from DB, creates user+agency on first call
router.get('/me', requireAuth, attachUser, async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// ─── Google OAuth routes ──────────────────────────────────────────────────────

// GET /api/auth/google/url?clientId=<uuid>
// Returns the Google OAuth URL as JSON. The frontend fetches this (with JWT auth)
// and then redirects the browser to it. Avoids the problem of browser redirects
// not being able to carry Authorization headers.
router.get('/google/url', requireAuth, attachUser, async (req, res, next) => {
  try {
    const { clientId } = req.query;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId required' });

    const client = await getClientById(clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const state = Buffer.from(
      JSON.stringify({ clientId, agencyId: req.user.agency_id, ts: Date.now() })
    ).toString('base64url');

    const oauth2Client = buildOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state,
    });

    res.json({ success: true, url });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google/callback
// Google redirects here after user grants consent.
// Public route — no JWT auth (browser is redirected here by Google).
// Security comes from the signed state parameter.
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn('Google OAuth denied by user', { error: oauthError });
      return res.redirect(`${process.env.FRONTEND_URL}/clients?google=denied`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/clients?google=error`);
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return res.redirect(`${process.env.FRONTEND_URL}/clients?google=invalid_state`);
    }

    // Reject stale states older than 10 minutes
    if (Date.now() - stateData.ts > 10 * 60 * 1000) {
      return res.redirect(`${process.env.FRONTEND_URL}/clients?google=expired`);
    }

    const { clientId, agencyId } = stateData;

    // Exchange authorization code for tokens
    const oauth2Client = buildOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in DB — linked to this client
    await storeGoogleToken(clientId, tokens);

    logger.info('Google OAuth token stored', { clientId, agencyId });
    res.redirect(`${process.env.FRONTEND_URL}/clients?google=connected&clientId=${clientId}`);
  } catch (err) {
    logger.error('Google OAuth callback error', { error: err.message });
    res.redirect(`${process.env.FRONTEND_URL}/clients?google=error`);
  }
});

// ─── Facebook OAuth routes ────────────────────────────────────────────────────

// GET /api/auth/facebook/url?clientId=<uuid>
// Requires facebook_page_id already set on the client — OAuth captures that page's token.
router.get('/facebook/url', requireAuth, attachUser, async (req, res, next) => {
  try {
    const { clientId } = req.query;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId required' });

    const client = await getClientById(clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    if (!client.facebook_page_id) {
      return res.status(400).json({
        success: false,
        error: 'Add a Facebook Page ID to this client before connecting. Edit the client to add it.',
      });
    }

    const state = Buffer.from(
      JSON.stringify({ clientId, agencyId: req.user.agency_id, ts: Date.now() })
    ).toString('base64url');

    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
      state,
      scope: 'pages_show_list,pages_read_engagement,read_insights',
    });

    res.json({ success: true, url: `https://www.facebook.com/v19.0/dialog/oauth?${params}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/facebook/callback
// Public — browser is redirected here by Facebook after consent.
router.get('/facebook/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    logger.warn('Facebook OAuth denied', { error: oauthError });
    return res.redirect(`${process.env.FRONTEND_URL}/clients?facebook=denied`);
  }

  if (!code || !state) {
    return res.redirect(`${process.env.FRONTEND_URL}/clients?facebook=error`);
  }

  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    return res.redirect(`${process.env.FRONTEND_URL}/clients?facebook=invalid_state`);
  }

  if (Date.now() - stateData.ts > 10 * 60 * 1000) {
    return res.redirect(`${process.env.FRONTEND_URL}/clients?facebook=expired`);
  }

  const { clientId } = stateData;

  try {
    // Exchange code for short-lived user token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        code,
      },
    });
    const shortToken = tokenRes.data.access_token;

    // Extend to long-lived token (~60 days)
    const longRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: shortToken,
      },
    });
    const longToken = longRes.data.access_token;
    const expiresIn = longRes.data.expires_in || 5184000; // 60 days default

    // Get the page ID stored on this client
    const clientResult = await db.query(
      `SELECT facebook_page_id FROM clients WHERE id = $1`,
      [clientId]
    );
    const pageId = clientResult.rows[0]?.facebook_page_id;
    if (!pageId) {
      logger.warn('Facebook callback: client has no facebook_page_id', { clientId });
      return res.redirect(`${process.env.FRONTEND_URL}/clients?facebook=error`);
    }

    // Get the page access token for this specific page
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { fields: 'id,name,access_token', access_token: longToken },
    });
    const pages = pagesRes.data.data || [];
    const page = pages.find((p) => p.id === pageId);

    if (!page) {
      logger.warn('Facebook callback: page not found in user accounts', { clientId, pageId });
      return res.redirect(`${process.env.FRONTEND_URL}/clients?facebook=page_not_found`);
    }

    // Delete any existing token for this client, then insert fresh
    await db.query(`DELETE FROM facebook_oauth_tokens WHERE client_id = $1`, [clientId]);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await db.query(
      `INSERT INTO facebook_oauth_tokens (client_id, access_token, expires_at)
       VALUES ($1, $2, $3)`,
      [clientId, page.access_token, expiresAt]
    );

    logger.info('Facebook token stored', { clientId, pageId: page.id });
    res.redirect(`${process.env.FRONTEND_URL}/clients?facebook=connected&clientId=${clientId}`);
  } catch (err) {
    logger.error('Facebook OAuth callback error', { error: err.message });
    res.redirect(`${process.env.FRONTEND_URL}/clients?facebook=error`);
  }
});

module.exports = router;
