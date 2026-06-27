// src/models/adminModel.js
const db = require('../config/db');

class AdminModel {
    /**
     * Extrae el conteo total de usuarios y movimientos activos del sistema.
     */
    async obtenerEstadisticasGenerales() {
        // Agregamos "WHERE deleted_at IS NULL" para no contar lo que está en la papelera
        const resUsuarios = await db.query('SELECT COUNT(*) AS total_usuarios FROM usuarios WHERE deleted_at IS NULL');
        const resMovimientos = await db.query('SELECT COUNT(*) AS total_movimientos FROM movimientos WHERE deleted_at IS NULL');
        
        return {
            usuariosRegistrados: parseInt(resUsuarios.rows[0].total_usuarios),
            movimientosTotales: parseInt(resMovimientos.rows[0].total_movimientos)
        };
    }
}

module.exports = new AdminModel();