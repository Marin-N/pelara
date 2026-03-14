const Stripe = require('stripe');
const db = require('../db');
const logger = require('../utils/logger');

// ── Plan definitions ───────────────────────────────────────────────────────────

const PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    currency: 'gbp',
    interval: 'month',
    clients_limit: 3,
    features: [
      'Up to 3 client locations',
      'Google Search Console analytics',
      'Google Business Profile metrics',
      'Weekly automated reports',
      'Email alerts on metric drops',
    ],
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  growth: {
    name: 'Growth',
    price: 199,
    currency: 'gbp',
    interval: 'month',
    clients_limit: 10,
    features: [
      'Up to 10 client locations',
      'GSC, GBP & GA4 analytics',
      'Facebook Page insights',
      'Weekly reports + email delivery',
      'Priority email alerts',
    ],
    priceId: process.env.STRIPE_GROWTH_PRICE_ID,
  },
  agency: {
    name: 'Agency',
    price: 399,
    currency: 'gbp',
    interval: 'month',
    clients_limit: null, // unlimited
    features: [
      'Unlimited client locations',
      'All data sources included',
      'Weekly reports with AI recommendations',
      'White-label report branding',
      'Priority support',
    ],
    priceId: process.env.STRIPE_AGENCY_PRICE_ID,
  },
};

// ── Stripe instance ────────────────────────────────────────────────────────────

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'xxx') throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2024-06-20' });
};

// ── Billing record helpers ────────────────────────────────────────────────────

/**
 * Get the billing row for an agency, creating it if it doesn't exist.
 */
const getOrCreateBillingRecord = async (agencyId) => {
  const existing = await db.query(
    `SELECT * FROM billing WHERE agency_id = $1`,
    [agencyId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const created = await db.query(
    `INSERT INTO billing (agency_id, plan, status)
     VALUES ($1, 'starter', 'trialing')
     ON CONFLICT (agency_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [agencyId]
  );
  return created.rows[0];
};

/**
 * Get or create a Stripe customer for an agency, saving the ID to billing table.
 */
const getOrCreateCustomer = async (agencyId) => {
  const billing = await getOrCreateBillingRecord(agencyId);
  if (billing.stripe_customer_id) return billing.stripe_customer_id;

  const agencyResult = await db.query(
    `SELECT a.name, u.email
     FROM agencies a
     LEFT JOIN users u ON u.agency_id = a.id AND u.role = 'agency_admin'
     WHERE a.id = $1
     LIMIT 1`,
    [agencyId]
  );
  const agency = agencyResult.rows[0];
  if (!agency) throw new Error('Agency not found');

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: agency.email,
    name: agency.name,
    metadata: { agency_id: agencyId },
  });

  await db.query(
    `UPDATE billing SET stripe_customer_id = $1, updated_at = NOW() WHERE agency_id = $2`,
    [customer.id, agencyId]
  );
  logger.info('Stripe customer created', { agencyId, customerId: customer.id });
  return customer.id;
};

// ── Checkout session ───────────────────────────────────────────────────────────

const createCheckoutSession = async (agencyId, planKey, returnUrl) => {
  const plan = PLANS[planKey];
  if (!plan) throw new Error(`Unknown plan: ${planKey}`);
  if (!plan.priceId || plan.priceId === 'xxx') {
    throw new Error(`Stripe price ID for "${planKey}" not configured — add STRIPE_${planKey.toUpperCase()}_PRICE_ID to .env`);
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

  logger.info('Checkout session created', { agencyId, planKey });
  return session.url;
};

// ── Billing portal ─────────────────────────────────────────────────────────────

const createBillingPortalSession = async (agencyId, returnUrl) => {
  const billing = await getOrCreateBillingRecord(agencyId);
  if (!billing.stripe_customer_id) {
    throw new Error('No Stripe customer found. Subscribe to a plan first.');
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
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
        logger.warn('Webhook: checkout.session.completed missing agency_id');
        break;
      }

      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;

      await db.query(
        `INSERT INTO billing (agency_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
         VALUES ($1, $2, $3, $4, 'active', $5)
         ON CONFLICT (agency_id) DO UPDATE SET
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           stripe_customer_id = EXCLUDED.stripe_customer_id,
           plan = EXCLUDED.plan,
           status = 'active',
           current_period_end = EXCLUDED.current_period_end,
           updated_at = NOW()`,
        [agencyId, session.customer, sub.id, planKey, periodEnd]
      );
      // Keep agencies.plan in sync for backwards compat
      await db.query(
        `UPDATE agencies SET plan = $1, stripe_subscription_id = $2, stripe_customer_id = $3 WHERE id = $4`,
        [planKey, sub.id, session.customer, agencyId]
      );
      logger.info('Subscription activated', { agencyId, planKey });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const agencyId = sub.metadata?.agency_id;
      if (!agencyId) break;

      const planKey = sub.metadata?.plan || 'starter';
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

      await db.query(
        `UPDATE billing SET plan = $1, status = $2, current_period_end = $3, updated_at = NOW()
         WHERE agency_id = $4`,
        [planKey, sub.status, periodEnd, agencyId]
      );
      logger.info('Subscription updated', { agencyId, planKey, status: sub.status });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const agencyId = sub.metadata?.agency_id;
      if (!agencyId) break;

      await db.query(
        `UPDATE billing SET
           plan = 'starter', stripe_subscription_id = NULL, status = 'canceled',
           current_period_end = NULL, updated_at = NOW()
         WHERE agency_id = $1`,
        [agencyId]
      );
      await db.query(
        `UPDATE agencies SET plan = 'starter', stripe_subscription_id = NULL WHERE id = $1`,
        [agencyId]
      );
      logger.info('Subscription canceled', { agencyId });
      break;
    }

    default:
      break;
  }
};

// ── Status / plan queries ──────────────────────────────────────────────────────

const getSubscriptionStatus = async (agencyId) => {
  const billing = await getOrCreateBillingRecord(agencyId);
  const currentPlanKey = billing.plan || 'starter';
  const currentPlan = PLANS[currentPlanKey] || PLANS.starter;

  return {
    current_plan: currentPlanKey,
    plan_name: currentPlan.name,
    clients_limit: currentPlan.clients_limit,
    status: billing.status || 'trialing',
    has_subscription: !!billing.stripe_subscription_id,
    current_period_end: billing.current_period_end,
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

/**
 * Returns the clients_limit for an agency based on their current plan.
 * null = unlimited.
 */
const getAgencyClientsLimit = async (agencyId) => {
  const billing = await getOrCreateBillingRecord(agencyId);
  const plan = PLANS[billing.plan || 'starter'] || PLANS.starter;
  return plan.clients_limit;
};

module.exports = {
  PLANS,
  createCheckoutSession,
  createBillingPortalSession,
  handleWebhookEvent,
  getSubscriptionStatus,
  getAgencyClientsLimit,
};
