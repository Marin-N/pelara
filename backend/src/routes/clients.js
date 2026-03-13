const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const {
  getClients, getClientById, createClient, updateClient, deactivateClient,
} = require('../services/clientService');

// All client routes require a valid JWT and a DB user record
router.use(requireAuth, attachUser);

// GET /api/clients — list all clients for the authenticated user's agency
router.get('/', async (req, res, next) => {
  try {
    const clients = await getClients(req.user.agency_id);
    res.json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients — create a new client under the user's agency
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const client = await createClient(req.user.agency_id, req.body);
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id — get a single client (agency-scoped)
router.get('/:id', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.id, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/:id — update a client's details
router.put('/:id', async (req, res, next) => {
  try {
    const client = await updateClient(req.params.id, req.user.agency_id, req.body);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clients/:id — soft delete (is_active = false), never hard delete
router.delete('/:id', async (req, res, next) => {
  try {
    const client = await deactivateClient(req.params.id, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
