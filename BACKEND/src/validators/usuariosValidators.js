/**
 * @file usuariosValidators.js
 * @description Validation chains de express-validator para el modulo de usuarios. Reproducen
 * EXACTAMENTE los checks manuales que antes vivian inline en usuariosController.js (mismo
 * criterio: parseInt + rechazar solo 0/vacio/no-numerico, permitiendo negativos, igual que
 * antes), para no endurecer ni relajar ninguna regla existente.
 */
const { param, body } = require('express-validator');

/**
 * Valida un parametro de ruta como id: reproduce `!parseInt(valor) || isNaN(parseInt(valor))`.
 * @param {string} nombreParam Nombre del parametro de ruta (ej. 'id', 'movimientoId').
 * @param {string} etiqueta Texto usado en el mensaje de error (ej. 'usuario', 'movimiento').
 */
function idValidoEnParam(nombreParam, etiqueta) {
    return param(nombreParam).custom((valor) => {
        const parseado = parseInt(valor, 10);
        if (!parseado || isNaN(parseado)) {
            throw new Error(`ID de ${etiqueta} invalido`);
        }
        return true;
    });
}

/** Reproduce `if (!monto || isNaN(monto) || parseFloat(monto) <= 0)`. */
const validarMonto = body('monto').custom((valor) => {
    if (!valor || isNaN(valor) || parseFloat(valor) <= 0) {
        throw new Error('El monto debe ser mayor a 0.');
    }
    return true;
});

/** Reproduce `if (!password || String(password).length < 8)`. */
const validarPassword = body('password').custom((valor) => {
    if (!valor || String(valor).length < 8) {
        throw new Error('La contrasena debe tener al menos 8 caracteres');
    }
    return true;
});

module.exports = {
    validarIdUsuario: [idValidoEnParam('id', 'usuario')],
    validarIdUsuarioYMovimiento: [idValidoEnParam('id', 'usuario'), idValidoEnParam('movimientoId', 'movimiento')],
    validarMontoMovimientoUsuario: [idValidoEnParam('id', 'usuario'), idValidoEnParam('movimientoId', 'movimiento'), validarMonto],
    validarPasswordUsuario: [idValidoEnParam('id', 'usuario'), validarPassword],
};
