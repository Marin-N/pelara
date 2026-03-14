require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Stripe webhook needs the raw request body for signature verification.
// Capture it BEFORE express.json() parses it away.
const captureRawBody = express.raw({ type: 'application/json' });
const storeRawBody = (req, res, next) => { req.rawBody = req.body; next(); };
app.use('/api/stripe/webhook', captureRawBody, storeRawBody);
app.use('/api/billing/webhook', captureRawBody, storeRawBody);

app.use(express.json());

// Health check — no auth required
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'Pelara',
    version: '0.1.0',
    timestamp: new Date(),
  });
});

// Register cron jobs (production only — noop in dev)
require('./jobs/syncMetrics');      // 02:00 UTC — fetch metrics from Google/Facebook APIs
require('./jobs/checkAlerts');      // 03:00 UTC — check for metric drops, create alerts
require('./jobs/generateReports');  // Mon 06:00 UTC — generate and email weekly reports

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/competitors', require('./routes/competitors'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/email', require('./routes/email'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Pelara backend running on port ${PORT}`);
});

module.exports = app;
