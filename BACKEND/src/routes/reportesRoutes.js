// src/routes/reportesRoutes.js
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const adminController = require('../controllers/adminController');
const reportesAdminController = require('../controllers/reportesAdminController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// ==========================================
// RUTAS PARA EL BOT DE TELEGRAM (Internas)
// ==========================================
// Estas rutas asumen que el ID de Telegram viene en el body o parámetros.
router.get('/telegram/hoy', asyncHandler(reportesController.hoy));
router.get('/telegram/mes', asyncHandler(reportesController.mes));
router.get('/telegram/balance', asyncHandler(reportesController.balance));
router.get('/telegram/categorias', asyncHandler(reportesController.categorias));

// ==========================================
// RUTAS PARA LA WEB / ANGULAR (Protegidas)
// ==========================================
// El middleware 'verificarToken' bloquea la petición si no hay un JWT válido.
// Si es válido, inyecta el 'usuario.id' y pasa al controlador '...Web'.
router.get('/web/hoy', verificarToken, asyncHandler(reportesController.hoyWeb));
router.get('/web/mes', verificarToken, asyncHandler(reportesController.mesWeb));
router.get('/web/balance', verificarToken, asyncHandler(reportesController.balanceWeb));
router.get('/web/categorias', verificarToken, asyncHandler(reportesController.categoriasWeb));
router.get('/web/metricas-globales', verificarToken, verificarAdmin, asyncHandler(adminController.verMetricas));
router.get('/web/dashboard-admin', verificarToken, verificarAdmin, asyncHandler(adminController.verDashboardAdmin));

// ==========================================
// MÓDULO DE REPORTES (Administración, protegidas)
// ==========================================
router.get('/admin/generar', verificarToken, verificarAdmin, asyncHandler(reportesAdminController.generar));
router.get('/admin/exportar', verificarToken, verificarAdmin, asyncHandler(reportesAdminController.exportar));

module.exports = router;