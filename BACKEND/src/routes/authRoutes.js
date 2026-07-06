const express = require('express');
const router = express.Router();
// Nota: Asegúrate de que el nombre del archivo coincida con cómo lo guardaste en la carpeta controllers
const authController = require('../controllers/authControllers');
const asyncHandler = require('../utils/asyncHandler');

// ==========================================
// RUTAS PÚBLICAS (Login y Registro)
// ==========================================
router.post('/login', asyncHandler(authController.login));
router.post('/register', asyncHandler(authController.registroPublico)); // Mantenida por compatibilidad
router.post('/registro', asyncHandler(authController.registroPublico));

// ==========================================
// RUTAS DE RECUPERACIÓN DE CONTRASEÑA
// ==========================================
router.post('/recuperar-password', asyncHandler(authController.solicitarRecuperacion));
router.post('/verificar-codigo', asyncHandler(authController.verificarCodigo));
router.post('/cambiar-password', asyncHandler(authController.cambiarContrasena));

module.exports = router;
