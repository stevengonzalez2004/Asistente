/**
 * @file configuracionQueries.js
 * @description Consultas SQL para el modulo de Configuracion (tabla clave/valor) y el
 * respaldo/restauracion de las tablas propias de la aplicacion.
 */

module.exports = {
    SELECT_ALL: `SELECT clave, valor FROM configuracion ORDER BY clave ASC`,

    UPSERT: `
        INSERT INTO configuracion (clave, valor, actualizado_en)
        VALUES ($1, $2, NOW())
        ON CONFLICT (clave) DO UPDATE SET valor = $2, actualizado_en = NOW()
    `,

    // Orden seguro por FK para exportar/restaurar (padres antes que hijos).
    TABLAS_RESPALDO: ['usuarios', 'tipos_movimiento', 'categorias', 'cuentas', 'movimientos', 'configuracion'],

    // TRUNCATE de las 6 tablas en una sola sentencia (CASCADE cubre cualquier FK no listada;
    // RESTART IDENTITY reinicia las secuencias serial). Se usa TRUNCATE en vez de DELETE porque
    // 'movimientos' tiene un trigger de proteccion (trigger_seguro_movimientos) que bloquea el
    // borrado fisico por fila; TRUNCATE no dispara triggers de fila, solo aplica en esta
    // operacion de restauracion, fuertemente resguardada con confirmacion explicita.
    TRUNCATE_RESPALDO: 'TRUNCATE movimientos, cuentas, categorias, tipos_movimiento, usuarios, configuracion RESTART IDENTITY CASCADE',
};
