const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const email = String(body.email || '').trim().toLowerCase();
        const drivers = Array.isArray(body.drivers) ? body.drivers : [];

        if (!email) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'email is required' }) };
        }

        const normalizedDrivers = drivers
            .map((d) => ({
                name: String(d.name || '').trim(),
                color: String(d.color || '#22d3ee'),
                squad: Number.isFinite(Number(d.squad)) ? Number(d.squad) : 0,
            }))
            .filter((d) => d.name.length > 0)
            .slice(0, 80);

        const sql = neon(process.env.NETLIFY_DATABASE_URL);

        await sql`
            CREATE TABLE IF NOT EXISTS driver_pools (
                id SERIAL PRIMARY KEY,
                owner_email VARCHAR(255) UNIQUE NOT NULL,
                drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        await sql`
            INSERT INTO driver_pools (owner_email, drivers, updated_at)
            VALUES (${email}, ${JSON.stringify(normalizedDrivers)}, NOW())
            ON CONFLICT (owner_email)
            DO UPDATE SET drivers = EXCLUDED.drivers, updated_at = NOW()
        `;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, drivers: normalizedDrivers })
        };
    } catch (error) {
        console.error('save-driver-pool error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message || 'Internal server error' })
        };
    }
};
