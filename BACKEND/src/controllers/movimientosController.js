// src/controllers/movimientosController.js
const movimientosService = require('../services/movimientosService');
const movimientosModel = require('../models/movimientosModel');
const logger = require('../utils/logger');

class MovimientosController {
    /**
     * Registra un movimiento financiero.
     */
    async registrar(req, res, next) {
        try {
            const {
                telegram_id,
                username,
                nombre,
                tipo,
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            } = req.body;

            const usuarioId = req.usuario.id || null;

            if (!tipo || !monto) {
                return res.status(400).json({
                    success: false,
                    message: 'Los campos tipo y monto son obligatorios.'
                });
            }

            const result = await movimientosService.registrarMovimiento({
                usuario_id: usuarioId,
                telegram_id,
                username,
                nombre,
                tipo,
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            });

            if (result.status === 'SALDO_INSUFICIENTE') {
                return res.status(400).json({
                    success: false,
                    message: `No tienes saldo suficiente en ${result.cuenta}. Faltan $${result.faltante.toFixed(2)}.`,
                    data: result
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Movimiento registrado correctamente.',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Crea una cuenta nueva para el usuario autenticado.
     */
    async crearCuenta(req, res, next) {
        try {
            const { nombre } = req.body;
            const usuarioId = req.usuario.id || null;

            if (!nombre || !usuarioId) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la cuenta y el usuario son obligatorios.'
                });
            }

            const result = await movimientosService.crearCuenta({ usuario_id: usuarioId, nombre });
            return res.status(result.creado ? 201 : 200).json({
                success: true,
                message: result.creado ? 'Cuenta creada correctamente.' : 'La cuenta ya existe.',
                data: result.cuenta
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene la lista de cuentas y saldo total.
     */
    async obtenerCuentas(req, res, next) {
        try {
            const { telegram_id } = req.query;
            
            // 1. Nuestra meta absoluta: conseguir un ID interno de base de datos (Ej: 4)
            let idInterno = req.usuario?.id || null;

            // 2. Si no hay token web (req.usuario es null), pero nos enviaron un telegram_id: "Traducimos"
            if (!idInterno && telegram_id) {
                // Reusamos tu función inteligente de Postgres. Si ya existía, nos devuelve su ID interno (4). 
                // Si no existía, lo crea en el acto. Cero riesgos.
                const usuarioDB = await movimientosModel.buscarOCrearUsuario(telegram_id, 'telegram_client', 'Usuario');
                idInterno = usuarioDB.id;
            }

            // 3. Si después de intentar ambos caminos seguimos en null, alguien intenta entrar sin credenciales
            if (!idInterno) {
                return res.status(401).json({
                    success: false,
                    message: 'No se pudo identificar al usuario para consultar sus cuentas.'
                });
            }

            // 4. A partir de esta línea, el Servicio vive feliz porque SIEMPRE recibe un entero pequeño (Ej: 4)
            const result = await movimientosService.listarCuentasUsuario(idInterno);
            
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Edita un movimiento desde el panel administrativo web (Angular)
     * Ruta esperada: PUT /api/movimientos/:id
     */
    async editarWeb(req, res, next) {
        try {
            const movimientoId = parseInt(req.params.id);
            const usuarioId = req.usuario.id;

            const {
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            } = req.body;

            if (!movimientoId || isNaN(movimientoId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID de movimiento inválido.' 
                });
            }
            if (!monto || isNaN(monto) || parseFloat(monto) <= 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El monto a editar debe ser un número mayor a 0.' 
                });
            }

            const movimientoActualizado = await movimientosModel.editarMovimiento(movimientoId, usuarioId, {
                categoria,
                monto: parseFloat(monto),
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            });

            return res.status(200).json({
                success: true,
                message: 'Movimiento actualizado correctamente. Los saldos han sido recalculados.',
                data: movimientoActualizado
            });

        } catch (error) {
            logger.error(`Error en editarWeb (Movimiento ID: ${req.params.id}):`, error);
            
            if (error.message && (error.message.includes('Se requiere') || error.message.includes('Faltan'))) {
                return res.status(400).json({ 
                    success: false, 
                    message: error.message 
                });
            }

            return res.status(500).json({ 
                success: false, 
                message: 'Error interno al intentar actualizar el movimiento.' 
            });
        }
    }
    /**
     * Elimina lógicamente un movimiento (Soft Delete) desde el panel web.
     * Ruta esperada: DELETE /api/movimientos/:id
     */
    async eliminarWeb(req, res, next) {
        try {
            const movimientoId = parseInt(req.params.id);

            // Validación básica del ID
            if (!movimientoId || isNaN(movimientoId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID de movimiento inválido.' 
                });
            }

            // Llamamos al modelo que ejecuta el procedimiento almacenado en Neon
            const resultado = await movimientosModel.eliminarMovimientoWeb(movimientoId);

            return res.status(200).json({
                success: true,
                message: resultado.message // "Movimiento enviado a la papelera correctamente."
            });

        } catch (error) {
            logger.error(`Error en eliminarWeb (Movimiento ID: ${req.params.id}):`, error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno al intentar eliminar el movimiento.' 
            });
        }
    }
    /**
     * Obtiene el historial completo de movimientos para la tabla del panel web.
     * Ruta esperada: GET /api/movimientos
     */
    async obtenerHistorialWeb(req, res, next) {
        try {
            const usuarioId = req.usuario.id;
            
            const historial = await movimientosModel.obtenerHistorial(usuarioId);
            
            return res.status(200).json({
                success: true,
                data: historial
            });
        } catch (error) {
            logger.error('Error al obtener historial de movimientos:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno al cargar el historial.' 
            });
        }
    }
}

module.exports = new MovimientosController();