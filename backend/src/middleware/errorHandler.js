const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Auth0 JWT errors come in with status property
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error('Request error', {
    status,
    message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(status).json({ success: false, error: message });
};

module.exports = { errorHandler };
