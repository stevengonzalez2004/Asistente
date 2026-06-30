const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');

// ==========================================
// RUTAS PROTEGIDAS (Solo Administradores)
// ==========================================

// GET /api/usuarios - Listar todos los usuarios
router.get('/', verificarToken, verificarAdmin, usuariosController.listarUsuarios);

// GET /api/usuarios/:id - Obtener un usuario específico
router.get('/:id', verificarToken, verificarAdmin, usuariosController.obtenerUsuarioPorId);

// DELETE /api/usuarios/:id - Deshabilitar (Soft Delete) un usuario
router.delete('/:id', verificarToken, verificarAdmin, usuariosController.deshabilitarUsuario);

module.exports = router;