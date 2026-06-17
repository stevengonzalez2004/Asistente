const { Pool } = require('pg');
require('dotenv').config();

// Configuración adaptada para Neon usando Connection String
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Obligatorio para conexiones a Neon
    }
};

const pool = new Pool(poolConfig);

// Eventos del pool
pool.on('connect', () => {
    console.log('Conexión con PostgreSQL (Neon) establecida correctamente.');
});

pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};