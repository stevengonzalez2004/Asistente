/**
 * @file authValidators.js
 * @description Validation chains de express-validator para el modulo de autenticacion. Los
 * limites de longitud reproducen exactamente los que ya exige el formulario Angular
 * (FRONTEND/src/app/pages/login/login.ts: Validators.minLength(6) para password/nuevaContrasena,
 * Validators.minLength(2) para nombre, min/maxLength(6) para codigoIngresado), para no rechazar
 * en el backend nada que el frontend ya permite.
 */
const { body } = require('express-validator');

const validarCorreo = body('correo').isEmail().withMessage('El correo no tiene un formato valido.');

const validarPasswordLogin = body('password')
    .isLength({ min: 6 })
    .withMessage('La contrasena debe tener al menos 6 caracteres.');

const validarNombre = body('nombre')
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres.');

const validarCodigoIngresado = body('codigoIngresado')
    .isLength({ min: 6, max: 6 })
    .withMessage('El codigo debe tener exactamente 6 caracteres.');

const validarNuevaContrasena = body('nuevaContrasena')
    .isLength({ min: 6 })
    .withMessage('La nueva contrasena debe tener al menos 6 caracteres.');

module.exports = {
    validarLogin: [validarCorreo, validarPasswordLogin],
    validarRegistro: [validarNombre, validarCorreo, validarPasswordLogin],
    validarRecuperarPassword: [validarCorreo],
    validarVerificarCodigo: [validarCorreo, validarCodigoIngresado],
    validarCambiarPassword: [validarCorreo, validarNuevaContrasena],
};
