// src/routes/reportesRoutes.js
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const adminController = require('../controllers/adminController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');

// ==========================================
// RUTAS PARA EL BOT DE TELEGRAM (Internas)
// ==========================================
// Estas rutas asumen que el ID de Telegram viene en el body o parámetros.
router.get('/telegram/hoy', reportesController.hoy);
router.get('/telegram/mes', reportesController.mes);
router.get('/telegram/balance', reportesController.balance);
router.get('/telegram/categorias', reportesController.categorias);

// ==========================================
// RUTAS PARA LA WEB / ANGULAR (Protegidas)
// ==========================================
// El middleware 'verificarToken' bloquea la petición si no hay un JWT válido.
// Si es válido, inyecta el 'usuario.id' y pasa al controlador '...Web'.
router.get('/web/hoy', verificarToken, reportesController.hoyWeb);
router.get('/web/mes', verificarToken, reportesController.mesWeb);
router.get('/web/balance', verificarToken, reportesController.balanceWeb);
router.get('/web/categorias', verificarToken, reportesController.categoriasWeb);
router.get('/web/metricas-globales', verificarToken, verificarAdmin, adminController.verMetricas);
module.exports = router;