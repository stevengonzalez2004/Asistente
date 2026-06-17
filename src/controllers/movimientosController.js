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

      if (!telegram_id || !tipo || !monto) {
        return res.status(400).json({
          success: false,
          message: 'Los campos telegram_id, tipo y monto son obligatorios.'
        });
      }

      const result = await movimientosService.registrarMovimiento({
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
   * Obtiene la lista de cuentas y saldo total.
   */
  async obtenerCuentas(req, res, next) {
    try {
      const { telegram_id } = req.query;
      if (!telegram_id) {
        return res.status(400).json({
          success: false,
          message: 'El parámetro telegram_id es requerido.'
        });
      }

      const result = await movimientosService.listarCuentasUsuario(telegram_id);
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
