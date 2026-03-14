const router = require('express').Router();
const Stripe = require('stripe');
const { requireAuth, attachUser } = require('../middleware/auth');
const {
  createCheckoutSession,
  createBillingPortalSession,
  handleWebhookEvent,
  getAgencyBilling,
} = require('../services/stripeService');
const logger = require('../utils/logger');

// ── Stripe webhook ─────────────────────────────────────────────────────────────
// Raw body is captured in index.js before express.json(), stored as req.rawBody

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || secret === 'xxx') {
    logger.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET not configured');
    return res.json({ received: true });
  }

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    // req.rawBody is a Buffer captured in index.js
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: `Webhook signature error: ${err.message}` });
  }

  try {
    await handleWebhookEvent(event);
  } catch (err) {
    logger.error('Stripe webhook handler error', { type: event.type, error: err.message });
    // Still return 200 so Stripe doesn't retry indefinitely
  }

  res.json({ received: true });
});

// ── Auth-protected billing routes ──────────────────────────────────────────────

router.use(requireAuth, attachUser);

// GET /api/billing/status — current plan, subscription state, all plans
router.get('/status', async (req, res, next) => {
  try {
    const billing = await getAgencyBilling(req.user.agency_id);
    res.json({ success: true, data: billing });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/checkout — create Stripe Checkout session, returns { url }
router.post('/checkout', async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ success: false, error: 'plan is required' });

    const returnUrl = `${process.env.FRONTEND_URL}/billing`;
    const url = await createCheckoutSession(req.user.agency_id, plan, returnUrl);
    res.json({ success: true, data: { url } });
  } catch (err) {
    if (err.message.includes('not configured') || err.message.includes('Unknown plan')) {
      return res.status(503).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// POST /api/billing/portal — create Stripe billing portal session, returns { url }
router.post('/portal', async (req, res, next) => {
  try {
    const returnUrl = `${process.env.FRONTEND_URL}/billing`;
    const url = await createBillingPortalSession(req.user.agency_id, returnUrl);
    res.json({ success: true, data: { url } });
  } catch (err) {
    if (
      err.message.includes('not configured') ||
      err.message.includes('No Stripe customer')
    ) {
      return res.status(503).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;
