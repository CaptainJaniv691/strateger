// ==========================================
// 🔑 PRO LICENSE VERIFICATION (Database-backed)
// ==========================================
// Validates license keys against the pro_licenses table in Neon DB.
// Supports: verify by key, bind Google email, lookup by email, device tracking.

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ valid: false, message: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const key = (body.key || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        const deviceId = (body.deviceId || '').trim();
        const bindEmail = !!body.bindEmail; // Flag: bind this email to the license

        const sql = neon(process.env.NETLIFY_DATABASE_URL);

        // Create table if it doesn't exist yet
        await sql`
            CREATE TABLE IF NOT EXISTS pro_licenses (
                id SERIAL PRIMARY KEY,
                license_key VARCHAR(64) UNIQUE NOT NULL,
                customer_email VARCHAR(255),
                customer_name VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                activated_at TIMESTAMPTZ,
                is_active BOOLEAN DEFAULT true,
                notes TEXT,
                device_id VARCHAR(128),
                last_device_at TIMESTAMPTZ
            )
        `;

        // Ensure device columns exist (idempotent for existing tables)
        await sql`
            DO $$ BEGIN
                ALTER TABLE pro_licenses ADD COLUMN IF NOT EXISTS device_id VARCHAR(128);
                ALTER TABLE pro_licenses ADD COLUMN IF NOT EXISTS last_device_at TIMESTAMPTZ;
            EXCEPTION WHEN OTHERS THEN NULL;
            END $$;
        `;

        // === Mode 1: Verify by license key ===
        if (key) {
            if (!key.startsWith('STRAT-') || key.length < 16) {
                return { statusCode: 200, headers, body: JSON.stringify({ valid: false, message: 'Invalid license key format' }) };
            }

            const rows = await sql`
                SELECT id, license_key, is_active, customer_email, activated_at
                FROM pro_licenses
                WHERE license_key = ${key}
            `;

            if (rows.length === 0) {
                console.log(`❌ License key not found: ${key.substring(0, 10)}...`);
                return { statusCode: 200, headers, body: JSON.stringify({ valid: false, message: 'Invalid license key' }) };
            }

            const license = rows[0];

            if (!license.is_active) {
                console.log(`⛔ Deactivated license used: ${key.substring(0, 10)}...`);
                return { statusCode: 200, headers, body: JSON.stringify({ valid: false, message: 'This license has been deactivated' }) };
            }

            // Mark first activation timestamp
            if (!license.activated_at) {
                await sql`UPDATE pro_licenses SET activated_at = NOW() WHERE id = ${license.id}`;
            }

            // Bind Google email to license if requested
            if (bindEmail && email) {
                await sql`UPDATE pro_licenses SET customer_email = ${email} WHERE id = ${license.id}`;
                console.log(`🔗 Bound email ${email} to license ${key.substring(0, 10)}...`);
            }

            // Update device tracking
            if (deviceId) {
                await sql`UPDATE pro_licenses SET device_id = ${deviceId}, last_device_at = NOW() WHERE id = ${license.id}`;
            }

            console.log(`✅ Pro license verified: ${key.substring(0, 10)}... (${license.customer_email || email || 'no email'})`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    valid: true, 
                    message: '⭐ Pro license verified!',
                    email: license.customer_email || email || null
                })
            };
        }

        // === Mode 2: Lookup by Google email ===
        if (email && !key) {
            const rows = await sql`
                SELECT license_key, is_active
                FROM pro_licenses
                WHERE LOWER(customer_email) = ${email} AND is_active = true
                LIMIT 1
            `;

            if (rows.length === 0) {
                return { statusCode: 200, headers, body: JSON.stringify({ valid: false, message: 'No license found for this email' }) };
            }

            const license = rows[0];

            // Update device tracking
            if (deviceId) {
                await sql`UPDATE pro_licenses SET device_id = ${deviceId}, last_device_at = NOW() WHERE license_key = ${license.license_key}`;
            }

            console.log(`✅ Pro license found by email: ${email}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    valid: true, 
                    key: license.license_key,
                    message: '⭐ Pro license restored from account!' 
                })
            };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ valid: false, message: 'No license key or email provided' }) };

    } catch (err) {
        console.error('License verification error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ valid: false, message: 'Server error during verification' }) };
    }
};
