import { query, initializeDatabase, closePool } from './src/config/database.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Ensure MOCK_DB is false for this test
process.env.MOCK_DB = 'false';

const logFile = './debug_log.txt';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

async function debug() {
    log('--- Database Debug Tool ---');
    log('DATABASE_URL starts with: ' + (process.env.DATABASE_URL?.substring(0, 20) + '...'));
    log('Timeout setting: 30000ms');

    try {
        log('\nStep 1: Attempting to connect and run simple query...');
        const now = await query('SELECT NOW()');
        log('SUCCESS! Current DB time: ' + now.rows[0].now);

        log('\nStep 2: Attempting to initialize tables...');
        await initializeDatabase();
        log('SUCCESS! Database initialization sequence completed.');

        log('\nStep 3: Attempting to list users...');
        const users = await query('SELECT count(*) FROM users');
        log('SUCCESS! Current user count: ' + users.rows[0].count);

    } catch (err) {
        log('\n--- DEBUG FAILED ---');
        log('Error Name: ' + err.name);
        log('Error Message: ' + err.message);
        log('Stack Trace:\n' + err.stack);
    } finally {
        try {
            await closePool();
        } catch (e) { }
        log('\nDebug session ended.');
    }
}

debug();
