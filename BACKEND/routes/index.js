const express = require('express');
const router = express.Router();

const authRoutes = require('../src/routes/authRoutes');
const movimientosRoutes = require('../src/routes/movimientosRoutes');
const iaRoutes = require('../src/routes/iaRoutes');
const reportesRoutes = require('../src/routes/reportesRoutes');
const usuariosRoutes = require('../src/routes/usuariosRoutes');

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
