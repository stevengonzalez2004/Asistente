// src/middlewares/validador.js
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. GUARDIA DE FORMULARIOS (validarCampos)
// ==========================================
const validarCampos = (req, res, next) => {
    const errores = validationResult(req);

    // Si hay errores, se detiene todo y le responde a Angular con los detalles
    if (!errores.isEmpty()) {
        return res.status(400).json({
            mensaje: 'Error en la validación de datos',
            errores: errores.array().map(err => ({
                campo: err.path,
                error: err.msg
            }))
        });
    }

    // Si todo está perfecto, le dice que pase al controlador (o al siguiente middleware)
    next();
};

// ==========================================
// 2. GUARDIA DE SEGURIDAD VIP (validarJWT)
// ==========================================
const validarJWT = (req, res, next) => {
    // Leer el token de los headers (Angular debe enviarlo como "x-token")
    const token = req.header('x-token');

    if (!token) {
        return res.status(401).json({
            message: 'No hay token en la petición. Acceso denegado.'
        });
    }

    try {
        // Verifica si el token es real y no ha expirado
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Guarda los datos del usuario en la request por si el controlador los necesita
        req.usuarioAutenticado = payload;

        next(); // Todo está bien puede continuar
    } catch (error) {
        return res.status(401).json({
            message: 'Token no válido o expirado.'
        });
    }
};

// ==========================================
// EXPORTAN AMBOS GUARDIAS
// ==========================================
module.exports = {
    validarCampos,
    validarJWT
};