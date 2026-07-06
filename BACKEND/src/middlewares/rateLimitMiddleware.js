/**
 * @file rateLimitMiddleware.js
 * @description Limitadores de tasa (rate limiting) para mitigar fuerza bruta y abuso de la API.
 * `limiterGlobal` cubre toda la API con un umbral generoso; `limiterAuth` es mas estricto y se
 * monta unicamente sobre las rutas de autenticacion (login/registro/recuperacion), no sobre
 * /api/auth/refresh (se llama legitimamente cada ~30 min por cada sesion activa).
 */
const rateLimit = require('express-rate-limit');

const limiterGlobal = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
    }),
});

const limiterAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => res.status(429).json({
        success: false,
        message: 'Demasiados intentos. Intenta nuevamente en unos minutos.',
    }),
});

module.exports = { limiterGlobal, limiterAuth };
