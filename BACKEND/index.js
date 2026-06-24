require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');

// Inicializar el Bot de Telegram
try {
  logger.info('Inicializando Bot de Telegram...');
  require('./src/telegram/bot');
} catch (error) {
  logger.error('Error crítico al inicializar el Bot de Telegram:', error);
}

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Servidor backend corriendo en el puerto ${PORT} (Entorno: ${process.env.NODE_ENV || 'development'})`);
});

// Manejo de cierres limpios
process.on('SIGTERM', () => {
  logger.info('Señal SIGTERM recibida, cerrando servidor HTTP de forma limpia...');
  server.close(() => {
    logger.info('Servidor HTTP cerrado.');
    process.exit(0);
  });
});
