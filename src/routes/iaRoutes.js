const express = require('express');
const router = express.Router();
const iaController = require('../controllers/iaController');

// POST /api/ia/procesar - Enviar texto para análisis e intenciones
router.post('/procesar', iaController.procesarMensaje);

module.exports = router;
