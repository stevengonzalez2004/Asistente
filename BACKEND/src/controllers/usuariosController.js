const bcrypt = require('bcryptjs');
const usuariosModel = require('../models/usuariosModel');
const movimientosModel = require('../models/movimientosModel');

class UsuariosController {
    async listarUsuarios(req, res, next) {
        try {
            const resultados = await usuariosModel.ObtenerTodosLosUsuarios();
            res.status(200).json({ success: true, data: resultados.rows });
        } catch (error) { next(error); }
    }

    async obtenerUsuarioPorId(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario invalido' });

            const resultado = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            res.status(200).json({ success: true, data: resultado.rows[0] });
        } catch (error) { next(error); }
    }

    async buscarUsuariosPorCorreo(req, res, next) {
        try {
            const correo = String(req.query.correo || '').trim();
            if (!correo) return res.status(400).json({ message: 'El correo es requerido' });

            const resultados = await usuariosModel.BuscarUsuariosPorCorreoAdmin(correo);
            res.status(200).json({ success: true, data: resultados.rows });
        } catch (error) { next(error); }
    }

    async actualizarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario invalido' });

            const { nombre, correo, password } = req.body;
            const datos = {};

            if (nombre !== undefined) datos.nombre = nombre;
            if (correo !== undefined) datos.correo = correo;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                datos.password = await bcrypt.hash(password, salt);
            }

            const resultado = await usuariosModel.ActualizarUsuarioAdmin(idUsuario, datos);
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            res.status(200).json({
                success: true,
                data: resultado.rows[0],
                message: 'Usuario actualizado correctamente'
            });
        } catch (error) {
            if (error.code === '23505') return res.status(400).json({ message: 'El correo ya esta registrado' });
            next(error);
        }
    }

    async listarMovimientosUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario invalido' });

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const historial = await movimientosModel.obtenerHistorialPorUsuarioAdmin(idUsuario);
            res.status(200).json({ success: true, data: historial });
        } catch (error) { next(error); }
    }

    async listarCuentasUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario invalido' });

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
        } catch (error) { next(error); }
    }

    async actualizarMovimientoUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const idMovimiento = parseInt(req.params.movimientoId);

            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario invalido' });
            if (!idMovimiento || isNaN(idMovimiento)) return res.status(400).json({ message: 'ID de movimiento invalido' });

            const { categoria, monto, cuenta_origen, cuenta_destino, descripcion, metodo_pago } = req.body;
            if (!monto || isNaN(monto) || parseFloat(monto) <= 0) {
                return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0.' });
            }

            const movimiento = await movimientosModel.editarMovimiento(idMovimiento, idUsuario, {
                categoria,
                monto: parseFloat(monto),
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            });

            res.status(200).json({
                success: true,
                data: movimiento,
                message: 'Movimiento actualizado correctamente'
            });
        } catch (error) { next(error); }
    }

    async eliminarMovimientoUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const idMovimiento = parseInt(req.params.movimientoId);
            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario invalido' });
            if (!idMovimiento || isNaN(idMovimiento)) return res.status(400).json({ message: 'ID de movimiento invalido' });

            const resultado = await movimientosModel.eliminarMovimientoWeb(idMovimiento, idUsuario);
            res.status(200).json({ success: true, message: resultado.message });
        } catch (error) { next(error); }
    }

    async deshabilitarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario invalido' });

            const existe = await usuariosModel.ObtenerUsuarioPorId(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            await usuariosModel.DeshabilitarUsuario(idUsuario);
            res.status(200).json({ success: true, message: 'Usuario deshabilitado correctamente' });
        } catch (error) { next(error); }
    }
}

module.exports = new UsuariosController();
