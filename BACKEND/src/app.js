const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// 1. Importamos tus 5 archivos de rutas exactamente como se llaman en tu carpeta
const authRoutes = require('./routes/authRoutes');
const iaRoutes = require('./routes/iaRoutes');
const movimientosRoutes = require('./routes/movimientosRoutes');
const reportesRoutes = require('./routes/reportesRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');

const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// Middlewares obligatorios de seguridad y formato
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de peticiones HTTP
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Ruta principal para verificar que el servidor está vivo
app.get('/', (req, res) => {
    res.status(200).json({
        mensaje: 'Servidor del Asistente Financiero funcionando correctamente 🚀',
        estado: 'Online'
    });
});

// 2. Conectamos cada archivo a su URL (¡Aquí ocurre la magia!)
app.use('/api/auth', authRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Manejo de rutas inexistentes (404) 
app.use((req, res, next) => {
    const error = new Error(`Ruta no encontrada - ${req.method} ${req.originalUrl}`);
    error.status = 404;
    next(error); 
});

// Middleware centralizado de errores 
app.use(errorMiddleware);

module.exports = app;