/**
 * @file movimientosValidators.js
 * @description Validation chains de express-validator para el modulo de movimientos.
 * Reproducen EXACTAMENTE los checks manuales que antes vivian inline en
 * movimientosController.js (mismo criterio y mismos textos de mensaje por metodo).
 */
const { param, body } = require('express-validator');

/** Reproduce `if (!parseInt(id) || isNaN(parseInt(id)))` con el mensaje propio de este modulo. */
function idMovimientoValido() {
    return param('id').custom((valor) => {
        const parseado = parseInt(valor, 10);
        if (!parseado || isNaN(parseado)) {
            throw new Error('ID de movimiento inválido.');
        }
        return true;
    });
}

/** Reproduce `if (!monto || isNaN(monto) || parseFloat(monto) <= 0)` de editarWeb. */
const validarMontoEdicion = body('monto').custom((valor) => {
    if (!valor || isNaN(valor) || parseFloat(valor) <= 0) {
        throw new Error('El monto a editar debe ser un número mayor a 0.');
    }
    return true;
});

module.exports = {
    validarIdMovimiento: [idMovimientoValido()],
    validarEdicionMovimiento: [idMovimientoValido(), validarMontoEdicion],
};
