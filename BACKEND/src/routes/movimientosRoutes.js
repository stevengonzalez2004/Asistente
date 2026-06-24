const express = require('express');
const router = express.Router();
const movimientosController = require('../controllers/movimientosController');
const { verificarToken } = require('../middlewares/authMiddleware');

// POST /api/movimientos - Registrar un nuevo movimiento
router.post('/', verificarToken, movimientosController.registrar);

// POST /api/movimientos/cuentas - Crear una cuenta nueva para el usuario autenticado
router.post('/cuentas', verificarToken, movimientosController.crearCuenta);

// GET /api/movimientos/cuentas - Listar las cuentas de un usuario con saldos
router.get('/cuentas', verificarToken, movimientosController.obtenerCuentas);

module.exports = router;