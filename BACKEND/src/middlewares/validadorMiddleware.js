// src/middlewares/validadorMiddleware.js
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. GUARDIA DE FORMULARIOS (validarCampos)
// ==========================================
const validarCampos = (req, res, next) => {
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
        return res.status(400).json({
            mensaje: 'Error en la validación de datos',
            errores: errores.array().map(err => ({
                campo: err.path,
                error: err.msg
            }))
        });
    }
    next();
};



// ==========================================
// EXPORTACIÓN DE GUARDIAS
// ==========================================
module.exports = {
    validarCampos,
};