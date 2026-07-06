const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// 1. Importamos el enrutador consolidado de la API (Director de Orquesta)
const apiRoutes = require('./routes/index');

const errorMiddleware = require('./middlewares/errorMiddleware');
const sanitizarMiddleware = require('./middlewares/sanitizarMiddleware');
const { limiterGlobal } = require('./middlewares/rateLimitMiddleware');

const app = express();

// Necesario para que express-rate-limit lea X-Forwarded-For correctamente detras de un proxy
// (Render/Railway/Nginx). Inofensivo en desarrollo local, donde no hay proxy delante.
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Middlewares obligatorios de seguridad y formato
app.use(helmet({
    contentSecurityPolicy: false, // API JSON pura, nunca sirve HTML - CSP no aporta aqui
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite que el SPA en otro origen
                                                            // consuma las respuestas via fetch/XHR
    hsts: { maxAge: 15552000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizarMiddleware);

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

// 2. Conectamos el enrutador centralizado bajo el prefijo /api
app.use('/api', limiterGlobal, apiRoutes);

// Manejo de rutas inexistentes (404) 
app.use((req, res, next) => {
    const error = new Error(`Ruta no encontrada - ${req.method} ${req.originalUrl}`);
    error.status = 404;
    next(error); 
});

// Middleware centralizado de errores 
app.use(errorMiddleware);

module.exports = app;