const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const router = require('../routes/index');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// Middlewares obligatorios
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de peticiones HTTP en desarrollo/producción
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// 🟢 AQUÍ ESTÁ LA CORRECCIÓN: La ruta principal va ANTES del 404
app.get('/', (req, res) => {
    res.status(200).json({
        mensaje: 'Servidor del Asistente Financiero funcionando correctamente 🚀',
        estado: 'Online'
    });
});

// Registrar enrutador central (las rutas de tu API)
app.use('/', router);

// 🔴 Manejo de rutas inexistentes (404) - ¡Debe ir casi al final!
app.use((req, res, next) => {
    const error = new Error(`Ruta no encontrada - ${req.method} ${req.originalUrl}`);
    error.status = 404;
    next(error); // Esto empuja el error al siguiente middleware
});

// Middleware centralizado de errores - ¡Debe ser SIEMPRE lo último!
app.use(errorMiddleware);

module.exports = app;