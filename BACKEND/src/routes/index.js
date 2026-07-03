const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const movimientosRoutes = require('./movimientosRoutes');
const iaRoutes = require('./iaRoutes');
const reportesRoutes = require('./reportesRoutes');
const usuariosRoutes = require('./usuariosRoutes');

// Registrar rutas
router.use('/api/auth', authRoutes);
router.use('/api/movimientos', movimientosRoutes);
router.use('/api/ia', iaRoutes);
router.use('/api/reportes', reportesRoutes);
router.use('/api/usuarios', usuariosRoutes);

// Ruta de estado general
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        status: 'UP'
    });
});

module.exports = router;
