/**
 * @file index.js
 * @description Director de orquesta para consolidar y exportar todas las rutas de la API bajo el prefijo principal.
 */

const express = require('express');
const router = express.Router();

// Importación de sub-rutas
const authRoutes = require('./authRoutes');
const iaRoutes = require('./iaRoutes');
const movimientosRoutes = require('./movimientosRoutes');
const reportesRoutes = require('./reportesRoutes');
const usuariosRoutes = require('./usuariosRoutes');

// Asignación de sub-rutas con sus respectivos prefijos
router.use('/auth', authRoutes);
router.use('/ia', iaRoutes);
router.use('/movimientos', movimientosRoutes);
router.use('/reportes', reportesRoutes);
router.use('/usuarios', usuariosRoutes);

/**
 * @route GET /api/health
 * @description Ruta de estado general de la API para monitoreo e integración.
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        status: 'UP'
    });
});

module.exports = router;
