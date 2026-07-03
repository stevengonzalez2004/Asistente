/**
 * @file usuariosQueries.js
 * @description Diccionario centralizado de consultas SQL para el módulo de usuarios (autenticación, registro, perfil, administración).
 */

module.exports = {
    /**
     * Invoca la función almacenada fx_buscar_por_correo.
     */
    BUSCAR_POR_CORREO: `
        SELECT * FROM fx_buscar_por_correo($1);
    `,

    /**
     * Invoca la función almacenada fx_registro_completo.
     */
    REGISTRO_COMPLETO: `
        SELECT * FROM fx_registro_completo($1, $2, $3);
    `,

    /**
     * Invoca la función almacenada fx_vincular_cuenta_web.
     */
    VINCULAR_CUENTA_WEB: `
        SELECT * FROM fx_vincular_cuenta_web($1, $2, $3);
    `,

    /**
     * Guarda el hash del código de recuperación y su expiración.
     */
    GUARDAR_CODIGO_RECUPERACION: `
        UPDATE usuarios 
        SET codigo_recuperacion = $1, codigo_expiracion = $2 
        WHERE correo = $3;
    `,

    /**
     * Obtiene los códigos temporales y verificación del usuario.
     */
    OBTENER_DATOS_RECUPERACION: `
        SELECT codigo_recuperacion, codigo_expiracion, codigo_verificacion 
        FROM usuarios 
        WHERE correo = $1;
    `,

    /**
     * Marca el código de recuperación como verificado.
     */
    MARCAR_CODIGO_VERIFICADO: `
        UPDATE usuarios 
        SET codigo_verificacion = true 
        WHERE correo = $1;
    `,

    /**
     * Actualiza la contraseña y limpia los campos del proceso de recuperación.
     */
    ACTUALIZAR_PASSWORD_Y_LIMPIAR: `
        UPDATE usuarios
        SET password = $1,
            codigo_recuperacion = NULL,
            codigo_expiracion = NULL,
            codigo_verificacion = false
        WHERE correo = $2;
    `,

    /**
     * Obtiene una lista de todos los usuarios activos ordenados por ID.
     */
    OBTENER_TODOS_LOS_USUARIOS: `
        SELECT id, nombre, correo, rol, telegram_id, deleted_at 
        FROM usuarios 
        WHERE deleted_at IS NULL 
        ORDER BY id ASC;
    `,

    /**
     * Obtiene un usuario activo por su ID.
     */
    OBTENER_USUARIO_POR_ID: `
        SELECT id, nombre, correo, rol, telegram_id, deleted_at 
        FROM usuarios 
        WHERE id = $1 AND deleted_at IS NULL;
    `,

    /**
     * Obtiene un usuario por su ID sin importar si está marcado como eliminado.
     */
    OBTENER_USUARIO_POR_ID_ADMIN: `
        SELECT id, nombre, correo, rol, telegram_id, deleted_at 
        FROM usuarios 
        WHERE id = $1;
    `,

    /**
     * Busca usuarios por correo para administración limitando a 50 registros.
     */
    BUSCAR_USUARIOS_POR_CORREO_ADMIN: `
        SELECT id, nombre, correo, rol, telegram_id, deleted_at
        FROM usuarios
        WHERE correo ILIKE $1
        ORDER BY deleted_at IS NULL DESC, id ASC
        LIMIT 50;
    `,

    /**
     * Genera la consulta dinámica para actualizar los datos de un usuario en administración.
     * 
     * @param {string[]} campos Array con los fragmentos de asignaciones (ej. ["nombre = $1", "correo = $2"]).
     * @param {number} indexId Índice numérico que ocupará el parámetro del ID (ej. 3).
     * @returns {string} Consulta SQL generada.
     */
    GENERAR_ACTUALIZACION_ADMIN: (campos, indexId) => `
        UPDATE usuarios
        SET ${campos.join(', ')}
        WHERE id = $${indexId} AND deleted_at IS NULL
        RETURNING id, nombre, correo, rol, telegram_id;
    `,

    /**
     * Realiza un soft delete de un usuario.
     */
    DESHABILITAR_USUARIO: `
        UPDATE usuarios 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = $1;
    `
};
