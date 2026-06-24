const express = require('express');
const router = express.Router();
const movimientosController = require('../controllers/movimientosController');

// POST /api/movimientos - Registrar un nuevo movimiento
router.post('/', movimientosController.registrar);

// GET /api/movimientos/cuentas - Listar las cuentas de un usuario con saldos
router.get('/cuentas', movimientosController.obtenerCuentas);

module.exports = router;
