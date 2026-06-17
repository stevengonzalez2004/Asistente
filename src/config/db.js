const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'asistente_financiero',
    password: process.env.DB_PASSWORD || 'jeremyjose2016',
    port: parseInt(process.env.DB_PORT || '5432', 10),
};

const pool = new Pool(poolConfig);

// Eventos del pool
pool.on('connect', () => {
    console.log('Conexión con PostgreSQL establecida correctamente.');
});

pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};