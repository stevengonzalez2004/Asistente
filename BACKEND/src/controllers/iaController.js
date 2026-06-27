// src/controllers/ia.Controller.js

const iaService = require('../services/iaService');

class IaController {
  /**
   * Procesa un mensaje de texto para extraer intenciones y entidades.
   */
  async procesarMensaje(req, res, next) {
    try {
      const { texto } = req.body;
      if (!texto) {
        return res.status(400).json({
          success: false,
          message: 'El campo "texto" es requerido en el cuerpo de la petición.'
        });
      }

      const analisis = await iaService.procesarMensaje(texto);
      return res.status(200).json({
        success: true,
        data: analisis
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new IaController();
