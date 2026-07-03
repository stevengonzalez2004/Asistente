// src/models/adminModel.js
const db = require('../config/db');
const adminQueries = require('../queries/adminQueries');

class AdminModel {
    /**
     * Extrae el conteo total de usuarios y movimientos activos del sistema.
     */
    async obtenerEstadisticasGenerales() {
        const resUsuarios = await db.query(adminQueries.OBTENER_TOTAL_USUARIOS);
        const resMovimientos = await db.query(adminQueries.OBTENER_TOTAL_MOVIMIENTOS);
        
        return {
            usuariosRegistrados: parseInt(resUsuarios.rows[0].total_usuarios),
            movimientosTotales: parseInt(resMovimientos.rows[0].total_movimientos)
        };
    }
}

module.exports = new AdminModel();