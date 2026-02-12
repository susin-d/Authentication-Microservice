import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import ws from 'ws';

dotenv.config();

// Configure neon to use WebSockets for resilient connectivity over port 443
neonConfig.webSocketConstructor = ws;

// IN-MEMORY MOCK STORE FOR REPORTS
const mockUsers = new Map();

// Neon DB connection pool (@neondatabase/serverless)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export const query = async (text, params) => {
  const start = Date.now();

  // SUPPORT MOCK MODE FOR REPORTS
  if (process.env.MOCK_DB === 'true') {
    const queryLower = text.toLowerCase();

    // Simulate table creation
    if (queryLower.includes('create table')) {
      return { rowCount: 0, rows: [] };
    }

    // Simulate user lookup
    if (queryLower.includes('select * from users where email')) {
      const email = params[0].toLowerCase();
      const user = mockUsers.get(email);
      console.log('MOCK DB: Looking up user by email:', email, user ? 'FOUND' : 'NOT FOUND');
      return {
        rowCount: user ? 1 : 0,
        rows: user ? [user] : []
      };
    }

    // Simulate User ID lookup
    if (queryLower.includes('select * from users where id')) {
      const id = params[0];
      const user = Array.from(mockUsers.values()).find(u => u.id === id);
      console.log('MOCK DB: Looking up user by id:', id, user ? 'FOUND' : 'NOT FOUND');
      return {
        rowCount: user ? 1 : 0,
        rows: user ? [user] : []
      };
    }

    // Simulate reset token lookup
    if (queryLower.includes('select * from users where reset_token')) {
      const token = params[0];
      // In mock mode, if the token is 'mock-token', return the first mock user
      const user = token === 'mock-token' ? Array.from(mockUsers.values())[0] : null;
      console.log('MOCK DB: Looking up user by reset_token:', user ? 'FOUND' : 'NOT FOUND');
      return {
        rowCount: user ? 1 : 0,
        rows: user ? [user] : []
      };
    }

    // Simulate user creation
    if (queryLower.includes('insert into users')) {
      const email = params[0].toLowerCase();
      const password_hash = params[1];
      const name = params[2];
      const newUser = {
        id: Buffer.from(email).toString('hex').substring(0, 12), // Deterministic unique ID
        email,
        password_hash,
        name,
        verified: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockUsers.set(email, newUser);
      console.log('MOCK DB: Created user:', email);
      return { rowCount: 1, rows: [newUser] };
    }

    // Simulate user updates (verification, password reset)
    if (queryLower.includes('update users')) {
      console.log('MOCK DB: Simulating user update');
      return { rowCount: 1, rows: [] };
    }

    // Simulate user deletion
    if (queryLower.includes('delete from users')) {
      const id = params[0];
      console.log('MOCK DB: Simulating user deletion for ID:', id);
      // Remove from map if possible (find by ID)
      for (const [email, user] of mockUsers.entries()) {
        if (user.id === id) {
          mockUsers.delete(email);
          break;
        }
      }
      return { rowCount: 1, rows: [] };
    }

    // Default mock response
    return { rowCount: 0, rows: [] };
  }

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Pool client
 */
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout of 5 seconds to release the client
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Override release to clear the timeout and release the client
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release();
  };

  return client;
};

/**
 * Initialize database tables
 */
export const initializeDatabase = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      verified BOOLEAN DEFAULT FALSE,
      reset_token VARCHAR(255),
      reset_token_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
  `;

  try {
    await query(createUsersTableQuery);
    await query(createIndexesQuery);
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Warning: Database initialization failed:', error.message);
    // DO NOT THROW HERE - Allow server to start even if DB is down
    // (Actual queries will throw later if not caught)
  }
};

/**
 * Close the database pool
 */
export const closePool = async () => {
  await pool.end();
};

export default {
  query,
  getClient,
  initializeDatabase,
  closePool
};
