const { auth, claimCheck } = require('express-oauth2-jwt-bearer');
const logger = require('../utils/logger');

// Validates the Auth0 JWT on every protected request.
// Auth0 uses RS256 with a JWKS endpoint — no secret needed here, only domain + audience.
const requireAuth = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  tokenSigningAlg: 'RS256',
});

// Middleware that attaches the full DB user record to req.user
// after JWT verification. Creates the user + agency on first login.
const attachUser = async (req, res, next) => {
  try {
    const { findOrCreateUser } = require('../services/userService');
    // Auth0 sub is the unique user identifier: "google-oauth2|xxx" or "auth0|xxx"
    const auth0Sub = req.auth.payload.sub;
    const email = req.auth.payload['email'] || req.auth.payload[`${process.env.AUTH0_AUDIENCE}/email`] || '';
    const name = req.auth.payload['name'] || req.auth.payload[`${process.env.AUTH0_AUDIENCE}/name`] || '';

    req.user = await findOrCreateUser({ auth0Sub, email, name });
    next();
  } catch (err) {
    logger.error('attachUser failed', { error: err.message });
    next(err);
  }
};

module.exports = { requireAuth, attachUser };
