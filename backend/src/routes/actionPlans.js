const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { generateActionPlan, getActionPlans } = require('../services/actionPlanService');

router.use(requireAuth, attachUser);

// GET /api/action-plans/:clientId — get plan history
router.get('/:clientId', async (req, res, next) => {
  try {
    const plans = await getActionPlans(req.params.clientId, req.user.agency_id);
    res.json({ success: true, data: plans });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

// POST /api/action-plans/:clientId/generate — generate new plan
router.post('/:clientId/generate', async (req, res, next) => {
  try {
    const plan = await generateActionPlan(req.params.clientId, req.user.agency_id);
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = router;
