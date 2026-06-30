const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, verificarAdmin, usuariosController.listarUsuarios);
router.get('/buscar', verificarToken, verificarAdmin, usuariosController.buscarUsuariosPorCorreo);
router.get('/:id/cuentas', verificarToken, verificarAdmin, usuariosController.listarCuentasUsuario);
router.get('/:id/movimientos', verificarToken, verificarAdmin, usuariosController.listarMovimientosUsuario);
router.put('/:id/movimientos/:movimientoId', verificarToken, verificarAdmin, usuariosController.actualizarMovimientoUsuario);
router.delete('/:id/movimientos/:movimientoId', verificarToken, verificarAdmin, usuariosController.eliminarMovimientoUsuario);
router.get('/:id', verificarToken, verificarAdmin, usuariosController.obtenerUsuarioPorId);
router.put('/:id', verificarToken, verificarAdmin, usuariosController.actualizarUsuario);
router.delete('/:id', verificarToken, verificarAdmin, usuariosController.deshabilitarUsuario);

module.exports = router;
