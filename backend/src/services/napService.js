const axios = require('axios');
const db = require('../db');
const logger = require('../utils/logger');

// ── Phone normalization ───────────────────────────────────────────────────────

const normalizePhone = (phone) => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  // UK +44 prefix: 447911123456 → 07911123456
  if (digits.startsWith('44') && digits.length === 12) {
    digits = '0' + digits.slice(2);
  }
  return digits;
};

// ── Fuzzy matching ────────────────────────────────────────────────────────────

const nameMatch = (found, expected) => {
  if (!found || !expected) return false;
  return found.toLowerCase().includes(expected.toLowerCase()) ||
         expected.toLowerCase().includes(found.toLowerCase());
};

const addressMatch = (found, expected) => {
  if (!found || !expected) return false;
  const f = found.toLowerCase();
  const e = expected.toLowerCase();
  // Check if any word of expected appears in found
  const words = e.split(/\s+/).filter((w) => w.length > 3);
  const matchCount = words.filter((w) => f.includes(w)).length;
  return matchCount >= Math.ceil(words.length / 2);
};

const phoneMatch = (found, expected) => {
  if (!found || !expected) return false;
  const fn = normalizePhone(found);
  const en = normalizePhone(expected);
  if (!fn || !en) return false;
  return fn === en || fn.endsWith(en.slice(-8)) || en.endsWith(fn.slice(-8));
};

// ── Source checks ─────────────────────────────────────────────────────────────

const checkGooglePlaces = async (client) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === 'xxx') return null;

  const query = `${client.name} ${client.city || ''}`.trim();

  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: { query, key: apiKey },
      timeout: 8000,
    });

    const places = res.data.results || [];
    if (!places.length) return null;

    // Take the first result
    const place = places[0];

    // Get details for phone number
    let phone_found = null;
    if (place.place_id) {
      try {
        const detailRes = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: place.place_id,
            fields: 'formatted_phone_number,international_phone_number',
            key: apiKey,
          },
          timeout: 8000,
        });
        const details = detailRes.data.result;
        phone_found = details?.formatted_phone_number || details?.international_phone_number || null;
      } catch (err) {
        logger.warn('Places details fetch failed', { error: err.message });
      }
    }

    return {
      source: 'google_places',
      name_found: place.name || null,
      address_found: place.formatted_address || null,
      phone_found,
    };
  } catch (err) {
    logger.warn('Google Places NAP check failed', { client: client.name, error: err.message });
    return null;
  }
};

const checkWebsite = async (client) => {
  if (!client.website_url) return null;

  const url = client.website_url.startsWith('http')
    ? client.website_url
    : `https://${client.website_url}`;

  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Pelara-NAP-Checker/1.0' },
      maxRedirects: 3,
    });
    const html = res.data || '';

    // Extract phone — UK patterns: 01xxx, 02xxx, 07xxx, +44xxx
    const phonePatterns = [
      /(?:\+44|0)[\s-]?(?:\d[\s-]?){9,11}/g,
      /\b0[1-9]\d{8,9}\b/g,
    ];
    let phone_found = null;
    for (const pattern of phonePatterns) {
      const matches = html.match(pattern);
      if (matches?.length) {
        phone_found = matches[0].replace(/[\s-]/g, '');
        break;
      }
    }

    // Extract business name — look for <title> or h1
    let name_found = null;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      name_found = titleMatch[1].split(/[-|·–]/)[0].trim();
    }
    if (!name_found) {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) name_found = h1Match[1].trim();
    }

    // Extract address — look for common UK postcode patterns
    let address_found = null;
    const postcodeMatch = html.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i);
    if (postcodeMatch) {
      // Find a larger block of text around the postcode
      const idx = html.indexOf(postcodeMatch[0]);
      const surrounding = html.slice(Math.max(0, idx - 80), idx + 20)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      address_found = surrounding || postcodeMatch[0];
    }

    return {
      source: 'website',
      name_found,
      address_found,
      phone_found,
    };
  } catch (err) {
    logger.warn('Website NAP check failed', { url, error: err.message });
    return null;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

const runNAPCheck = async (clientId, agencyId) => {
  const clientResult = await db.query(
    `SELECT id, name, address, phone, city, website_url FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientResult.rows.length) throw new Error('Client not found');
  const client = clientResult.rows[0];

  const sources = await Promise.all([
    checkGooglePlaces(client),
    checkWebsite(client),
  ]);

  const checks = sources.filter(Boolean);
  const stored = [];

  for (const check of checks) {
    const nm = nameMatch(check.name_found, client.name);
    const am = addressMatch(check.address_found, client.address);
    const pm = phoneMatch(check.phone_found, client.phone);

    const result = await db.query(
      `INSERT INTO nap_checks
         (client_id, source, name_found, address_found, phone_found, name_match, address_match, phone_match)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [clientId, check.source, check.name_found, check.address_found, check.phone_found, nm, am, pm]
    );
    stored.push(result.rows[0]);
  }

  // Score: each check has 3 possible matches × each source
  const totalPossible = checks.length * 3;
  const totalMatched = stored.reduce(
    (sum, c) => sum + (c.name_match ? 1 : 0) + (c.address_match ? 1 : 0) + (c.phone_match ? 1 : 0),
    0
  );
  const score = totalPossible > 0 ? Math.round((totalMatched / totalPossible) * 100) : 0;

  logger.info('NAP check complete', { clientId, sources: checks.length, score });

  return {
    client: { name: client.name, address: client.address, phone: client.phone },
    checks: stored,
    score,
    checked_at: new Date(),
  };
};

const getLatestNAPChecks = async (clientId, agencyId) => {
  const clientCheck = await db.query(
    `SELECT id FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientCheck.rows.length) throw new Error('Client not found');

  // Get most recent check per source
  const result = await db.query(
    `SELECT DISTINCT ON (source) *
     FROM nap_checks
     WHERE client_id = $1
     ORDER BY source, checked_at DESC`,
    [clientId]
  );

  const checks = result.rows;

  // Compute score from latest checks
  const totalPossible = checks.length * 3;
  const totalMatched = checks.reduce(
    (sum, c) => sum + (c.name_match ? 1 : 0) + (c.address_match ? 1 : 0) + (c.phone_match ? 1 : 0),
    0
  );
  const score = totalPossible > 0 ? Math.round((totalMatched / totalPossible) * 100) : null;

  return { checks, score };
};

module.exports = { runNAPCheck, getLatestNAPChecks };
