const router = require('express').Router();
const { google } = require('googleapis');
const { requireAuth, attachUser } = require('../middleware/auth');
const { storeGoogleToken } = require('../services/tokenService');
const { getClientById } = require('../services/clientService');
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

module.exports = router;
