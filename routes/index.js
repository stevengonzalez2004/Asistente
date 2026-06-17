const express = require('express');
const router = express.Router();

const movimientosRoutes = require('../src/routes/movimientosRoutes');
const iaRoutes = require('../src/routes/iaRoutes');
const reportesRoutes = require('../src/routes/reportesRoutes');

// Registrar rutas
router.use('/api/movimientos', movimientosRoutes);
router.use('/api/ia', iaRoutes);
router.use('/api/reportes', reportesRoutes);

// Ruta de estado general
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    status: 'UP'
  });
});

module.exports = router;
