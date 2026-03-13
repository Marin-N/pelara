const db = require('../db');

// Every query filters by agency_id to prevent cross-agency data leakage.
// The agency_id always comes from the authenticated user's DB record, never from request params.

const getClients = async (agencyId) => {
  const result = await db.query(
    `SELECT c.*,
       CASE WHEN t.client_id IS NOT NULL THEN true ELSE false END AS has_google_connected
     FROM clients c
     LEFT JOIN google_oauth_tokens t ON t.client_id = c.id
     WHERE c.agency_id = $1
     ORDER BY c.name ASC`,
    [agencyId]
  );
  return result.rows;
};

const getClientById = async (id, agencyId) => {
  const result = await db.query(
    `SELECT * FROM clients WHERE id = $1 AND agency_id = $2`,
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

  const result = await db.query(
    `UPDATE clients SET
       name = COALESCE($3, name),
       business_type = COALESCE($4, business_type),
       address = COALESCE($5, address),
       city = COALESCE($6, city),
       country = COALESCE($7, country),
       phone = COALESCE($8, phone),
       website_url = COALESCE($9, website_url),
       gbp_location_id = COALESCE($10, gbp_location_id),
       ga4_property_id = COALESCE($11, ga4_property_id),
       gsc_site_url = COALESCE($12, gsc_site_url),
       facebook_page_id = COALESCE($13, facebook_page_id),
       updated_at = NOW()
     WHERE id = $1 AND agency_id = $2
     RETURNING *`,
    [id, agencyId, name, business_type, address, city, country,
     phone, website_url, gbp_location_id, ga4_property_id, gsc_site_url, facebook_page_id]
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
