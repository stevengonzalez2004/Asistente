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

/** Validación completa para registrar nuevos movimientos financieros. */
const validarCreacionMovimiento = [
    body('tipo')
        .notEmpty().withMessage('El tipo de movimiento es obligatorio.')
        .isIn(['INGRESO', 'GASTO', 'TRANSFERENCIA']).withMessage('Tipo de movimiento no válido (debe ser INGRESO, GASTO o TRANSFERENCIA).'),
    body('monto')
        .notEmpty().withMessage('El monto es obligatorio.')
        .isFloat({ gt: 0 }).withMessage('El monto debe ser un número positivo mayor a 0.')
        .custom((val) => {
            if (parseFloat(val) > 1000000000) {
                throw new Error('El monto ingresado excede el límite permitido de $1,000,000,000.');
            }
            return true;
        }),
    body('categoria')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('La categoría no puede exceder los 50 caracteres.'),
    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('La descripción no puede exceder los 255 caracteres.'),
];

/** Validación para crear una cuenta financiera. */
const validarCreacionCuenta = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre de la cuenta es obligatorio.')
        .isLength({ min: 2, max: 50 }).withMessage('El nombre de la cuenta debe tener entre 2 y 50 caracteres.'),
];

module.exports = {
    validarIdMovimiento: [idMovimientoValido()],
    validarEdicionMovimiento: [idMovimientoValido(), validarMontoEdicion],
    validarCreacionMovimiento,
    validarCreacionCuenta,
};
