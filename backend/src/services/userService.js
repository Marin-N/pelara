const db = require('../db');
const logger = require('../utils/logger');

/**
 * Find or create a user by Auth0 subject (sub).
 * On first login: creates both the agency and user record in a transaction.
 * On subsequent logins: returns the existing user.
 *
 * Auth0 sub is stored as the user's unique key — email can change but sub is permanent.
 */
const findOrCreateUser = async ({ auth0Sub, email, name }) => {
  // Check if user exists by auth0_sub
  const existing = await db.query(
    'SELECT u.*, a.name AS agency_name, a.plan AS agency_plan FROM users u LEFT JOIN agencies a ON u.agency_id = a.id WHERE u.auth0_sub = $1',
    [auth0Sub]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // First login — create agency + user in a single transaction
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Create the agency first (named after the user initially, they can rename later)
    const agencyResult = await client.query(
      `INSERT INTO agencies (name, plan) VALUES ($1, 'starter') RETURNING *`,
      [`${name || email}'s Agency`]
    );
    const agency = agencyResult.rows[0];

    // Create the user as agency_admin
    const userResult = await client.query(
      `INSERT INTO users (auth0_sub, email, name, role, agency_id) VALUES ($1, $2, $3, 'agency_admin', $4) RETURNING *`,
      [auth0Sub, email, name, agency.id]
    );
    const user = userResult.rows[0];

    // Set the agency owner back to the new user
    await client.query(
      'UPDATE agencies SET owner_user_id = $1 WHERE id = $2',
      [user.id, agency.id]
    );

    await client.query('COMMIT');

    logger.info('New user registered', { userId: user.id, email, agencyId: agency.id });
    return { ...user, agency_name: agency.name, agency_plan: agency.plan };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getUserById = async (id) => {
  const result = await db.query(
    'SELECT u.*, a.name AS agency_name, a.plan AS agency_plan FROM users u LEFT JOIN agencies a ON u.agency_id = a.id WHERE u.id = $1',
    [id]
  );
  return result.rows[0] || null;
};

module.exports = { findOrCreateUser, getUserById };
