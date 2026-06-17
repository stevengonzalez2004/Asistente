const reportesService = require('../services/reportesService');

class ReportesController {
  /**
   * Obtiene el balance general del usuario.
   */
  async balance(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) {
        return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });
      }

      const result = await reportesService.obtenerBalance(telegramId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene los movimientos financieros del día de hoy.
   */
  async hoy(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) {
        return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });
      }

      const result = await reportesService.obtenerReporteHoy(telegramId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el resumen del mes actual.
   */
  async mes(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) {
        return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });
      }

      const result = await reportesService.obtenerReporteMes(telegramId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene la distribución de gastos por categoría en el mes actual.
   */
  async categorias(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) {
        return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });
      }

      const result = await reportesService.obtenerReporteCategorias(telegramId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportesController();
