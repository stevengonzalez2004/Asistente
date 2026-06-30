const express = require('express');
const router = express.Router();
// Nota: Asegúrate de que el nombre del archivo coincida con cómo lo guardaste en la carpeta controllers
const authController = require('../controllers/authControllers'); 

// ==========================================
// RUTAS PÚBLICAS (Login y Registro)
// ==========================================
router.post('/login', authController.login);
router.post('/register', authController.registroPublico); // Mantenida por compatibilidad
router.post('/registro', authController.registroPublico);

// ==========================================
// RUTAS DE RECUPERACIÓN DE CONTRASEÑA
// ==========================================
router.post('/recuperar-password', authController.solicitarRecuperacion);
router.post('/verificar-codigo', authController.verificarCodigo);
router.post('/cambiar-password', authController.cambiarContrasena);

module.exports = router;