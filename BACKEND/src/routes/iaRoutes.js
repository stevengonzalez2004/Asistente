const express = require('express');
const router = express.Router();
const iaController = require('../controllers/iaController');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/ia/procesar - Enviar texto para análisis e intenciones
router.post('/procesar', asyncHandler(iaController.procesarMensaje));

module.exports = router;
