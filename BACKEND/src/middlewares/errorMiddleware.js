// src/middlewares/errorMiddleware.js
const logger = require('../utils/logger');

// Middleware para manejo de errores globales
const errorMiddleware = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  // Registrar error con stack trace completo
  logger.error(`${req.method} ${req.originalUrl} - ${status} - ${message}`, err);

  res.status(status).json({
    success: false,
    status,
    message,
    // Mostrar stack trace solo en desarrollo para facilitar depuración
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorMiddleware;
