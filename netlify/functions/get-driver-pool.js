const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
    }

    try {
        const email = String(event.queryStringParameters?.email || '').trim().toLowerCase();
        if (!email) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'email is required' }) };
        }

        const sql = neon(process.env.NETLIFY_DATABASE_URL);

        await sql`
            CREATE TABLE IF NOT EXISTS driver_pools (
                id SERIAL PRIMARY KEY,
                owner_email VARCHAR(255) UNIQUE NOT NULL,
                drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        const rows = await sql`
            SELECT drivers, updated_at
            FROM driver_pools
            WHERE owner_email = ${email}
            LIMIT 1
        `;

        if (!rows.length) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, drivers: [], updatedAt: null })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                drivers: Array.isArray(rows[0].drivers) ? rows[0].drivers : [],
                updatedAt: rows[0].updated_at || null
            })
        };
    } catch (error) {
        console.error('get-driver-pool error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message || 'Internal server error' })
        };
    }
};
