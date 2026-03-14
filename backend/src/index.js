require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
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
require('./jobs/syncMetrics');   // 02:00 UTC — fetch metrics from Google/Facebook APIs
require('./jobs/checkAlerts');   // 03:00 UTC — check for metric drops, create alerts

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/competitors', require('./routes/competitors'));
app.use('/api/alerts', require('./routes/alerts'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Pelara backend running on port ${PORT}`);
});

module.exports = app;
