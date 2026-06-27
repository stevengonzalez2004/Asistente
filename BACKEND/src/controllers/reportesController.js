// src/controllers/reportesController.js
const reportesService = require('../services/reportesService');
const movimientosModel = require('../models/movimientosModel'); // Importado para extraer datos limpios para la Web

class ReportesController {
  // ==========================================
  // CONTROLADORES TELEGRAM (Devuelven Texto/Emojis)
  // ==========================================
  
  async balance(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });
      
      const result = await reportesService.obtenerBalance(telegramId);
      return res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async hoy(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });
      
      const result = await reportesService.obtenerReporteHoy(telegramId);
      return res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async mes(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });
      
      const result = await reportesService.obtenerReporteMes(telegramId);
      return res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async categorias(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });
      
      const result = await reportesService.obtenerReporteCategorias(telegramId);
      return res.status(200).json(result);
    } catch (error) { next(error); }
  }

  // ==========================================
  // CONTROLADORES WEB (Devuelven JSON limpio para Angular)
  // ==========================================

  async balanceWeb(req, res, next) {
    try {
      // El ID real de PostgreSQL ya viene inyectado gracias al auth.middleware
      const usuarioId = req.usuario.id; 
      
      const balanceTotal = await movimientosModel.obtenerBalanceTotal(usuarioId);
      const cuentas = await movimientosModel.listarCuentas(usuarioId);

      return res.status(200).json({
        success: true,
        balance_total: balanceTotal,
        cuentas: cuentas
      });
    } catch (error) { next(error); }
  }

  async hoyWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const movimientos = await movimientosModel.obtenerResumenHoy(usuarioId);

      return res.status(200).json({
  success: true,
  movimientos 
});
    } catch (error) { next(error); }
  }

  async mesWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const movimientos = await movimientosModel.obtenerResumenMes(usuarioId);

      return res.status(200).json({
        success: true,
        movimientos
      });
    } catch (error) { next(error); }
  }

  async categoriasWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const categorias = await movimientosModel.obtenerGastosCategoriaMes(usuarioId);

      return res.status(200).json({
        success: true,
        categorias
      });
    } catch (error) { next(error); }
  }
}

module.exports = new ReportesController();