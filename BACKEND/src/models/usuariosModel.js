// src/models/usuariosModel.js
const db = require('../config/db');

class UsuariosModel {
    /**
     * Busca un usuario en la base de datos por su correo electrónico.
     * Útil para el proceso de Login.
     * * @param {string} correo - El correo del usuario.
     * @returns {Object} El resultado de la consulta de base de datos.
     */
    async BuscarPorCorreo(correo) {
        const query = `
            SELECT id, telegram_id, nombre, correo, password 
            FROM usuarios 
            WHERE correo = $1
        `;
        return await db.query(query, [correo]);
    }

    /**
     * Registra un nuevo usuario en la base de datos desde la Web.
     * * @param {Object} datos - Objeto con nombre, correo y password (ya encriptado).
     * @returns {Object} Los datos básicos del usuario creado.
     */
    async RegistroCompleto(datos) {
        const { nombre, correo, password } = datos;
        
        const query = `
            INSERT INTO usuarios (nombre, correo, password) 
            VALUES ($1, $2, $3) 
            RETURNING id, nombre, correo
        `;
        
        const resultado = await db.query(query, [nombre, correo, password]);
        return resultado.rows[0];
    }
    /**
     * Actualiza el correo y contraseña de un usuario creado vía Telegram.
     */
    async VincularCuentaWeb(telegramId, correo, passwordHash) {
        const query = `
            UPDATE usuarios 
            SET correo = $1, password = $2 
            WHERE telegram_id = $3 
            RETURNING id, nombre, correo
        `;
        const resultado = await db.query(query, [correo, passwordHash, telegramId]);
        return resultado.rows[0];
    }
}

module.exports = new UsuariosModel();