const bcrypt = require('bcryptjs');
const usuariosModel = require('../models/usuariosModel');
const movimientosModel = require('../models/movimientosModel');
const logger = require('../utils/logger');
const { mapUsuario, mapUsuarios } = require('../dtos/usuarioDto');

class UsuariosController {
    /**
     * Lista usuarios de forma paginada, ordenable y filtrable (rol, estado, busqueda por texto).
     * @route GET /api/usuarios
     */
    async listarUsuarios(req, res, next) {
        try {
            const { page = 1, limit = 20, sortBy = 'id', sortDir = 'asc', rol, estado, q } = req.query;

            const resultado = await usuariosModel.ListarUsuariosPaginado({
                page: parseInt(page) || 1,
                limit: Math.min(parseInt(limit) || 20, 100),
                sortBy, sortDir, rol, estado, q,
            });

            res.status(200).json({
                success: true,
                data: mapUsuarios(resultado.data),
                meta: { total: resultado.total, page: resultado.page, limit: resultado.limit },
            });
        } catch (error) {
            logger.error('Error al listar usuarios:', error);
            next(error);
        }
    }

    /**
     * Obtiene un usuario por id (incluye deshabilitados, uso administrativo).
     * @route GET /api/usuarios/:id
     */
    async obtenerUsuarioPorId(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const resultado = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            res.status(200).json({ success: true, data: mapUsuario(resultado.rows[0]) });
        } catch (error) {
            logger.error('Error al obtener usuario por id:', error);
            next(error);
        }
    }

    /**
     * Busca usuarios cuyo correo coincida (parcial) con el termino de busqueda.
     * @route GET /api/usuarios/buscar
     */
    async buscarUsuariosPorCorreo(req, res, next) {
        try {
            const correo = String(req.query.correo || '').trim();
            if (!correo) return res.status(400).json({ message: 'El correo es requerido' });

            const resultados = await usuariosModel.BuscarUsuariosPorCorreoAdmin(correo);
            res.status(200).json({ success: true, data: mapUsuarios(resultados.rows) });
        } catch (error) {
            logger.error('Error al buscar usuarios por correo:', error);
            next(error);
        }
    }

    /**
     * Actualiza nombre/correo/rol/password de un usuario.
     * @route PUT /api/usuarios/:id
     */
    async actualizarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const { nombre, correo, password, rol } = req.body;
            const datos = {};

            if (nombre !== undefined) datos.nombre = nombre;
            if (correo !== undefined) datos.correo = correo;
            if (rol !== undefined) datos.rol = rol;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                datos.password = await bcrypt.hash(password, salt);
            }

            const resultado = await usuariosModel.ActualizarUsuarioAdmin(idUsuario, datos);
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            logger.info(`Usuario ${idUsuario} actualizado por admin.`);
            res.status(200).json({
                success: true,
                data: mapUsuario(resultado.rows[0]),
                message: 'Usuario actualizado correctamente'
            });
        } catch (error) {
            if (error.code === '23505') return res.status(400).json({ message: 'El correo ya esta registrado' });
            logger.error('Error al actualizar usuario:', error);
            next(error);
        }
    }

    /**
     * Lista el historial de movimientos de un usuario (vista administrativa).
     * @route GET /api/usuarios/:id/movimientos
     */
    async listarMovimientosUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const historial = await movimientosModel.obtenerHistorialPorUsuarioAdmin(idUsuario);
            res.status(200).json({ success: true, data: historial });
        } catch (error) {
            logger.error('Error al listar movimientos de usuario:', error);
            next(error);
        }
    }

    /**
     * Lista las cuentas y el balance total de un usuario (vista administrativa).
     * @route GET /api/usuarios/:id/cuentas
     */
    async listarCuentasUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const cuentas = await movimientosModel.listarCuentas(idUsuario);
            const balanceTotal = await movimientosModel.obtenerBalanceTotal(idUsuario);

            res.status(200).json({
                success: true,
                data: {
                    balance_total: balanceTotal,
                    cuentas
                }
            });
        } catch (error) {
            logger.error('Error al listar cuentas de usuario:', error);
            next(error);
        }
    }

    /**
     * Edita un movimiento puntual de un usuario (vista administrativa).
     * @route PUT /api/usuarios/:id/movimientos/:movimientoId
     */
    async actualizarMovimientoUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const idMovimiento = parseInt(req.params.movimientoId);
            const { categoria, monto, cuenta_origen, cuenta_destino, descripcion, metodo_pago } = req.body;

            const movimiento = await movimientosModel.editarMovimiento(idMovimiento, idUsuario, {
                categoria,
                monto: parseFloat(monto),
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            });

            logger.info(`Movimiento ${idMovimiento} del usuario ${idUsuario} actualizado por admin.`);
            res.status(200).json({
                success: true,
                data: movimiento,
                message: 'Movimiento actualizado correctamente'
            });
        } catch (error) {
            logger.error('Error al actualizar movimiento de usuario:', error);
            next(error);
        }
    }

    /**
     * Elimina un movimiento puntual de un usuario (vista administrativa).
     * @route DELETE /api/usuarios/:id/movimientos/:movimientoId
     */
    async eliminarMovimientoUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const idMovimiento = parseInt(req.params.movimientoId);

            const resultado = await movimientosModel.eliminarMovimientoWeb(idMovimiento, idUsuario);
            logger.info(`Movimiento ${idMovimiento} del usuario ${idUsuario} eliminado por admin.`);
            res.status(200).json({ success: true, message: resultado.message });
        } catch (error) {
            logger.error('Error al eliminar movimiento de usuario:', error);
            next(error);
        }
    }

    /**
     * Deshabilita (soft-delete) un usuario.
     * @route DELETE /api/usuarios/:id
     */
    async deshabilitarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const existe = await usuariosModel.ObtenerUsuarioPorId(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            await usuariosModel.DeshabilitarUsuario(idUsuario);
            logger.info(`Usuario ${idUsuario} deshabilitado por admin.`);
            res.status(200).json({ success: true, message: 'Usuario deshabilitado correctamente' });
        } catch (error) {
            logger.error('Error al deshabilitar usuario:', error);
            next(error);
        }
    }

    /**
     * Reactiva un usuario previamente deshabilitado.
     * @route PUT /api/usuarios/:id/reactivar
     */
    async reactivarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const resultado = await usuariosModel.ReactivarUsuario(idUsuario);
            logger.info(`Usuario ${idUsuario} reactivado por admin.`);
            res.status(200).json({ success: true, data: mapUsuario(resultado.rows[0]), message: 'Usuario reactivado correctamente' });
        } catch (error) {
            logger.error('Error al reactivar usuario:', error);
            next(error);
        }
    }

    /**
     * Restablece la contrasena de un usuario (accion administrativa).
     * @route PUT /api/usuarios/:id/password
     */
    async restablecerPassword(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const { password } = req.body;

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const resultado = await usuariosModel.ActualizarUsuarioAdmin(idUsuario, { password: hash });
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            logger.info(`Password del usuario ${idUsuario} restablecida por admin.`);
            res.status(200).json({ success: true, message: 'Contrasena restablecida correctamente' });
        } catch (error) {
            logger.error('Error al restablecer password de usuario:', error);
            next(error);
        }
    }

    /**
     * Obtiene balance total, resumen del mes y gastos por categoria de un usuario.
     * @route GET /api/usuarios/:id/estadisticas
     */
    async obtenerEstadisticasUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const [balanceTotal, resumenMes, gastosCategoriaMes] = await Promise.allSettled([
                movimientosModel.obtenerBalanceTotal(idUsuario),
                movimientosModel.obtenerResumenMes(idUsuario),
                movimientosModel.obtenerGastosCategoriaMes(idUsuario),
            ]);

            const valorO = (resultado, porDefecto) => (resultado.status === 'fulfilled' ? resultado.value : porDefecto);

            res.status(200).json({
                success: true,
                data: {
                    balanceTotal: valorO(balanceTotal, 0),
                    resumenMes: valorO(resumenMes, []),
                    gastosCategoriaMes: valorO(gastosCategoriaMes, []),
                },
            });
        } catch (error) {
            logger.error('Error al obtener estadisticas de usuario:', error);
            next(error);
        }
    }
}

module.exports = new UsuariosController();
