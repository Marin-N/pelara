const router = require('express').Router();
const Stripe = require('stripe');
const { requireAuth, attachUser } = require('../middleware/auth');
const {
  createCheckoutSession,
  createBillingPortalSession,
  handleWebhookEvent,
  getSubscriptionStatus,
} = require('../services/stripeService');
const logger = require('../utils/logger');

// ── POST /api/stripe/webhook ─────────────────────────────────────────────────
// Public — Stripe sends signed events here. Raw body captured in index.js.

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
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    logger.warn('Stripe webhook signature failed', { error: err.message });
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    await handleWebhookEvent(event);
  } catch (err) {
    logger.error('Stripe webhook handler error', { type: event.type, error: err.message });
  }

  res.json({ received: true });
});

// ── Auth-protected routes ─────────────────────────────────────────────────────

router.use(requireAuth, attachUser);

// GET /api/stripe/subscription — current plan + all available plans
router.get('/subscription', async (req, res, next) => {
  try {
    const status = await getSubscriptionStatus(req.user.agency_id);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

// POST /api/stripe/create-checkout — start Stripe Checkout, returns { url }
router.post('/create-checkout', async (req, res, next) => {
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

// POST /api/stripe/portal — open Stripe billing portal, returns { url }
router.post('/portal', async (req, res, next) => {
  try {
    const returnUrl = `${process.env.FRONTEND_URL}/billing`;
    const url = await createBillingPortalSession(req.user.agency_id, returnUrl);
    res.json({ success: true, data: { url } });
  } catch (err) {
    if (err.message.includes('not configured') || err.message.includes('No Stripe customer')) {
      return res.status(503).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;
