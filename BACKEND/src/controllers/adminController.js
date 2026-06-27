// src/controllers/adminController.js
const adminModel = require('../models/adminModel');
const logger = require('../utils/logger');

class AdminController {
    /**
     * Obtiene métricas globales de la aplicación (Solo para Administradores)
     */
    async verMetricas(req, res, next) {
        try {
            logger.info(`El administrador con ID ${req.usuario.id} está consultando las métricas globales.`);
            
            // Llamamos al modelo para que haga el conteo en la base de datos
            const metricas = await adminModel.obtenerEstadisticasGenerales();

            return res.status(200).json({
                success: true,
                mensaje: 'Métricas obtenidas correctamente',
                data: metricas
            });

        } catch (error) {
            logger.error('Error al obtener métricas de administrador:', error);
            next(error);
        }
    }
}

module.exports = new AdminController();