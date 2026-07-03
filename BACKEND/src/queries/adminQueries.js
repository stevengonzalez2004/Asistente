/**
 * @file adminQueries.js
 * @description Diccionario centralizado de consultas SQL para el módulo de administración.
 */

module.exports = {
    /**
     * Obtiene el conteo total de usuarios activos (no eliminados lógicamente).
     */
    OBTENER_TOTAL_USUARIOS: `
        SELECT COUNT(*) AS total_usuarios 
        FROM usuarios 
        WHERE deleted_at IS NULL
    `,

    /**
     * Obtiene el conteo total de movimientos activos (no eliminados lógicamente).
     */
    OBTENER_TOTAL_MOVIMIENTOS: `
        SELECT COUNT(*) AS total_movimientos 
        FROM movimientos 
        WHERE deleted_at IS NULL
    `
};
