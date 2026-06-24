const movimientosService = require('../services/movimientosService');

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

      const usuarioId = req.usuario?.id || null;

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

      if (result?.status === 'SALDO_INSUFICIENTE') {
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
      const usuarioId = req.usuario?.id || null;

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
      const usuarioId = req.usuario?.id || null;
      const identificador = usuarioId || telegram_id;

      if (!identificador) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un usuario autenticado o el parámetro telegram_id.'
        });
      }

      const result = await movimientosService.listarCuentasUsuario(identificador);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MovimientosController();
