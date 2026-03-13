const { auth } = require('express-oauth2-jwt-bearer');

// Auth0 JWT verification middleware
// Applied per-route, not globally, so /health stays public
const requireAuth = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  tokenSigningAlg: 'RS256',
});

module.exports = { requireAuth };
