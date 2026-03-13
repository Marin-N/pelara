const { google } = require('googleapis');
const db = require('../db');
const logger = require('../utils/logger');

// Build an authenticated OAuth2Client for a given client's stored Google token.
// Automatically listens for token refresh events and persists the new access token.
const getOAuth2Client = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM google_oauth_tokens WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 1`,
    [clientId]
  );
  if (!result.rows.length) return null;

  const stored = result.rows[0];
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: new Date(stored.expires_at).getTime(),
  });

  // Persist refreshed tokens back to DB automatically
  oauth2Client.on('tokens', async (tokens) => {
    logger.info('Google token refreshed', { clientId });
    await db.query(
      `UPDATE google_oauth_tokens
       SET access_token = $1,
           expires_at = $2,
           updated_at = NOW()
       WHERE client_id = $3`,
      [tokens.access_token, new Date(tokens.expiry_date), clientId]
    );
  });

  return oauth2Client;
};

// Upsert — one token record per client, replace on reconnect
const storeGoogleToken = async (clientId, tokens) => {
  await db.query(
    `INSERT INTO google_oauth_tokens (client_id, access_token, refresh_token, expires_at, scope)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (client_id) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, google_oauth_tokens.refresh_token),
       expires_at = EXCLUDED.expires_at,
       scope = EXCLUDED.scope,
       updated_at = NOW()`,
    [
      clientId,
      tokens.access_token,
      tokens.refresh_token,
      new Date(tokens.expiry_date || Date.now() + 3600000),
      tokens.scope,
    ]
  );
};

const hasGoogleToken = async (clientId) => {
  const result = await db.query(
    `SELECT 1 FROM google_oauth_tokens WHERE client_id = $1 LIMIT 1`,
    [clientId]
  );
  return result.rows.length > 0;
};

module.exports = { getOAuth2Client, storeGoogleToken, hasGoogleToken };
