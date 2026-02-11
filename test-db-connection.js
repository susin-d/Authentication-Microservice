import { query } from './config/database.js';

async function testConnection() {
    try {
        console.log('Attempting to connect to database...');
        const result = await query('SELECT NOW()', []);
        console.log('Connection successful!', result.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
