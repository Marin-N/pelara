const db = require('../db');

// Every query filters by agency_id to prevent cross-agency data leakage.
// The agency_id always comes from the authenticated user's DB record, never from request params.

const getClients = async (agencyId) => {
  const result = await db.query(
    `SELECT c.*,
       CASE WHEN g.client_id IS NOT NULL THEN true ELSE false END AS has_google_connected,
       CASE WHEN f.client_id IS NOT NULL THEN true ELSE false END AS has_facebook_connected
     FROM clients c
     LEFT JOIN google_oauth_tokens g ON g.client_id = c.id
     LEFT JOIN facebook_oauth_tokens f ON f.client_id = c.id
     WHERE c.agency_id = $1
     ORDER BY c.name ASC`,
    [agencyId]
  );
  return result.rows;
};

const getClientById = async (id, agencyId) => {
  const result = await db.query(
    `SELECT c.*,
       CASE WHEN g.client_id IS NOT NULL THEN true ELSE false END AS has_google_connected,
       CASE WHEN f.client_id IS NOT NULL THEN true ELSE false END AS has_facebook_connected
     FROM clients c
     LEFT JOIN google_oauth_tokens g ON g.client_id = c.id
     LEFT JOIN facebook_oauth_tokens f ON f.client_id = c.id
     WHERE c.id = $1 AND c.agency_id = $2`,
    [id, agencyId]
  );
  return result.rows[0] || null;
};

const createClient = async (agencyId, data) => {
  const {
    name, business_type, address, city, country,
    phone, website_url, gbp_location_id, ga4_property_id,
    gsc_site_url, facebook_page_id,
  } = data;

  const result = await db.query(
    `INSERT INTO clients
       (agency_id, name, business_type, address, city, country, phone, website_url,
        gbp_location_id, ga4_property_id, gsc_site_url, facebook_page_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [agencyId, name, business_type, address, city, country || 'GB', phone,
     website_url, gbp_location_id, ga4_property_id, gsc_site_url, facebook_page_id]
  );
  return result.rows[0];
};

const updateClient = async (id, agencyId, data) => {
  const {
    name, business_type, address, city, country,
    phone, website_url, gbp_location_id, ga4_property_id,
    gsc_site_url, facebook_page_id,
  } = data;

  // NULLIF converts empty strings to NULL so COALESCE keeps existing values.
  // This lets users clear fields by sending null, but prevents empty strings from overwriting good data.
  const result = await db.query(
    `UPDATE clients SET
       name             = COALESCE(NULLIF($3, ''), name),
       business_type    = COALESCE(NULLIF($4, ''), business_type),
       address          = $5,
       city             = COALESCE(NULLIF($6, ''), city),
       country          = COALESCE(NULLIF($7, ''), country),
       phone            = $8,
       website_url      = $9,
       gbp_location_id  = $10,
       ga4_property_id  = $11,
       gsc_site_url     = $12,
       facebook_page_id = $13,
       updated_at       = NOW()
     WHERE id = $1 AND agency_id = $2
     RETURNING *`,
    [id, agencyId,
     name || null, business_type || null, address || null, city || null, country || null,
     phone || null, website_url || null,
     gbp_location_id || null, ga4_property_id || null, gsc_site_url || null, facebook_page_id || null]
  );
  return result.rows[0] || null;
};

// Soft delete only — we never hard-delete clients, data must be preserved
const deactivateClient = async (id, agencyId) => {
  const result = await db.query(
    `UPDATE clients SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND agency_id = $2 RETURNING *`,
    [id, agencyId]
  );
  return result.rows[0] || null;
};

module.exports = { getClients, getClientById, createClient, updateClient, deactivateClient };
