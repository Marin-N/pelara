const Stripe = require('stripe');
const db = require('../db');
const logger = require('../utils/logger');

// ── Plan definitions ───────────────────────────────────────────────────────────
// Price IDs are created in the Stripe dashboard and stored in .env

const PLANS = {
  starter: {
    name: 'Starter',
    price: 49,
    currency: 'gbp',
    interval: 'month',
    clients_limit: 1,
    features: [
      '1 client location',
      'Google Search Console analytics',
      'Google Business Profile metrics',
      'Weekly PDF-style reports',
      'Email alerts on drops',
    ],
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  growth: {
    name: 'Growth',
    price: 99,
    currency: 'gbp',
    interval: 'month',
    clients_limit: 5,
    features: [
      'Up to 5 client locations',
      'GSC, GBP & GA4 analytics',
      'Facebook Page insights',
      'Weekly reports + email delivery',
      'Priority email alerts',
    ],
    priceId: process.env.STRIPE_GROWTH_PRICE_ID,
  },
  agency: {
    name: 'Agency',
    price: 199,
    currency: 'gbp',
    interval: 'month',
    clients_limit: 20,
    features: [
      'Up to 20 client locations',
      'All data sources included',
      'Weekly reports with recommendations',
      'White-label report branding',
      'Priority alerts + competitor tracking',
    ],
    priceId: process.env.STRIPE_AGENCY_PRICE_ID,
  },
  agency_pro: {
    name: 'Agency Pro',
    price: 399,
    currency: 'gbp',
    interval: 'month',
    clients_limit: null, // unlimited
    features: [
      'Unlimited client locations',
      'All data sources included',
      'White-label everything',
      'Custom report branding',
      'Dedicated account support',
    ],
    priceId: process.env.STRIPE_AGENCY_PRO_PRICE_ID,
  },
};

// ── Stripe instance ────────────────────────────────────────────────────────────

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'xxx') throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2024-06-20' });
};

// ── Customer ───────────────────────────────────────────────────────────────────

const getOrCreateCustomer = async (agencyId) => {
  const agencyResult = await db.query(
    `SELECT stripe_customer_id, name FROM agencies WHERE id = $1`,
    [agencyId]
  );
  const agency = agencyResult.rows[0];
  if (!agency) throw new Error('Agency not found');
  if (agency.stripe_customer_id) return agency.stripe_customer_id;

  const userResult = await db.query(
    `SELECT email FROM users WHERE agency_id = $1 AND role = 'agency_admin' LIMIT 1`,
    [agencyId]
  );
  const email = userResult.rows[0]?.email;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: agency.name,
    metadata: { agency_id: agencyId },
  });

  await db.query(
    `UPDATE agencies SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
    [customer.id, agencyId]
  );
  logger.info('Stripe customer created', { agencyId, customerId: customer.id });
  return customer.id;
};

// ── Checkout ───────────────────────────────────────────────────────────────────

const createCheckoutSession = async (agencyId, planKey, returnUrl) => {
  const plan = PLANS[planKey];
  if (!plan) throw new Error(`Unknown plan: ${planKey}`);
  if (!plan.priceId || plan.priceId === 'xxx') {
    throw new Error(`Stripe price ID for plan "${planKey}" not configured in .env`);
  }

  const stripe = getStripe();
  const customerId = await getOrCreateCustomer(agencyId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${returnUrl}?billing=success`,
    cancel_url: `${returnUrl}?billing=cancelled`,
    subscription_data: {
      metadata: { agency_id: agencyId, plan: planKey },
    },
    allow_promotion_codes: true,
  });

  logger.info('Checkout session created', { agencyId, planKey, sessionId: session.id });
  return session.url;
};

// ── Billing portal ─────────────────────────────────────────────────────────────

const createBillingPortalSession = async (agencyId, returnUrl) => {
  const stripe = getStripe();
  const result = await db.query(
    `SELECT stripe_customer_id FROM agencies WHERE id = $1`,
    [agencyId]
  );
  const customerId = result.rows[0]?.stripe_customer_id;
  if (!customerId) throw new Error('No Stripe customer found. Subscribe to a plan first.');

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
};

// ── Webhook handler ────────────────────────────────────────────────────────────

const handleWebhookEvent = async (event) => {
  const stripe = getStripe();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription') break;

      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const agencyId = sub.metadata?.agency_id;
      const planKey = sub.metadata?.plan || 'starter';
      if (!agencyId) {
        logger.warn('Webhook checkout.session.completed: missing agency_id metadata');
        break;
      }

      await db.query(
        `UPDATE agencies
         SET stripe_subscription_id = $1, plan = $2, subscription_status = 'active', updated_at = NOW()
         WHERE id = $3`,
        [sub.id, planKey, agencyId]
      );
      logger.info('Subscription activated', { agencyId, planKey, subscriptionId: sub.id });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const agencyId = sub.metadata?.agency_id;
      if (!agencyId) break;

      const planKey = sub.metadata?.plan || 'starter';
      await db.query(
        `UPDATE agencies
         SET plan = $1, subscription_status = $2, updated_at = NOW()
         WHERE id = $3`,
        [planKey, sub.status, agencyId]
      );
      logger.info('Subscription updated', { agencyId, planKey, status: sub.status });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const agencyId = sub.metadata?.agency_id;
      if (!agencyId) break;

      await db.query(
        `UPDATE agencies
         SET plan = 'starter', stripe_subscription_id = NULL, subscription_status = 'canceled', updated_at = NOW()
         WHERE id = $1`,
        [agencyId]
      );
      logger.info('Subscription canceled', { agencyId });
      break;
    }

    default:
      break;
  }
};

// ── Status query ───────────────────────────────────────────────────────────────

const getAgencyBilling = async (agencyId) => {
  const result = await db.query(
    `SELECT plan, subscription_status, stripe_customer_id, stripe_subscription_id
     FROM agencies WHERE id = $1`,
    [agencyId]
  );
  const agency = result.rows[0];
  if (!agency) throw new Error('Agency not found');

  const currentPlanKey = agency.plan || 'starter';
  const currentPlan = PLANS[currentPlanKey] || PLANS.starter;

  return {
    current_plan: currentPlanKey,
    plan_name: currentPlan.name,
    clients_limit: currentPlan.clients_limit,
    subscription_status: agency.subscription_status || 'trialing',
    has_subscription: !!agency.stripe_subscription_id,
    plans: Object.entries(PLANS).map(([key, p]) => ({
      key,
      name: p.name,
      price: p.price,
      currency: p.currency,
      interval: p.interval,
      clients_limit: p.clients_limit,
      features: p.features,
      is_current: key === currentPlanKey,
    })),
  };
};

module.exports = {
  PLANS,
  createCheckoutSession,
  createBillingPortalSession,
  handleWebhookEvent,
  getAgencyBilling,
};
