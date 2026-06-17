const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

// Endpoints requeridos:
// GET /api/reportes/hoy
// GET /api/reportes/mes
// GET /api/reportes/balance
// GET /api/reportes/categorias

router.get('/hoy', reportesController.hoy);
router.get('/mes', reportesController.mes);
router.get('/balance', reportesController.balance);
router.get('/categorias', reportesController.categorias);

module.exports = router;
