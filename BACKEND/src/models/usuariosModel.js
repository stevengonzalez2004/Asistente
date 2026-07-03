// src/models/usuariosModel.js
const db = require('../config/db');
const usuariosQueries = require('../queries/usuariosQueries');

class UsuariosModel {
    // ==========================================
    // MÉTODOS DE AUTENTICACIÓN Y REGISTRO
    // ==========================================

    /**
     * Busca un usuario delegando la consulta a fx_buscar_por_correo.
     * @param {string} correo Correo electrónico del usuario.
     */
    async BuscarPorCorreo(correo) {
        return await db.query(usuariosQueries.BUSCAR_POR_CORREO, [correo]);
    }

    /**
     * Registra un nuevo usuario delegando la inserción a fx_registro_completo.
     * @param {object} datos Datos del usuario (nombre, correo, password).
     */
    async RegistroCompleto(datos) {
        const { nombre, correo, password } = datos;
        const resultado = await db.query(usuariosQueries.REGISTRO_COMPLETO, [nombre, correo, password]);
        return resultado.rows[0];
    }

    /**
     * Vincula la cuenta delegando la actualización a fx_vincular_cuenta_web.
     * @param {string} telegramId ID de Telegram del usuario.
     * @param {string} correo Correo electrónico del usuario.
     * @param {string} passwordHash Hash de la contraseña.
     */
    async VincularCuentaWeb(telegramId, correo, passwordHash) {
        const resultado = await db.query(usuariosQueries.VINCULAR_CUENTA_WEB, [telegramId, correo, passwordHash]);
        return resultado.rows[0];
    }

    // ==========================================
    // MÉTODOS DE RECUPERACIÓN DE CONTRASEÑA
    // ==========================================

    /**
     * Guarda el hash del código de recuperación y su fecha de expiración.
     * @param {string} correo Correo electrónico del usuario.
     * @param {string} codigoHasheado Código de recuperación codificado.
     * @param {Date} expiracion Fecha y hora de expiración.
     */
    async GuardarCodigoRecuperacion(correo, codigoHasheado, expiracion) {
        return await db.query(usuariosQueries.GUARDAR_CODIGO_RECUPERACION, [codigoHasheado, expiracion, correo]);
    }

    /**
     * Obtiene los datos de recuperación actuales del usuario.
     * @param {string} correo Correo electrónico del usuario.
     */
    async ObtenerDatosRecuperacion(correo) {
        const res = await db.query(usuariosQueries.OBTENER_DATOS_RECUPERACION, [correo]);
        return res.rows[0];
    }

    /**
     * Autoriza al usuario a cambiar su contraseña tras validar el código.
     * @param {string} correo Correo electrónico del usuario.
     */
    async MarcarCodigoVerificado(correo) {
        return await db.query(usuariosQueries.MARCAR_CODIGO_VERIFICADO, [correo]);
    }

    /**
     * Guarda la nueva contraseña y limpia los campos temporales de recuperación.
     * @param {string} correo Correo electrónico del usuario.
     * @param {string} nuevaPasswordHash Hash de la nueva contraseña.
     */
    async ActualizarPasswordYLimpiar(correo, nuevaPasswordHash) {
        return await db.query(usuariosQueries.ACTUALIZAR_PASSWORD_Y_LIMPIAR, [nuevaPasswordHash, correo]);
    }

    // ==========================================
    // MÉTODOS DE ADMINISTRACIÓN (Panel Web)
    // ==========================================

    /**
     * Lista todos los usuarios activos del sistema.
     */
    async ObtenerTodosLosUsuarios() {
        return await db.query(usuariosQueries.OBTENER_TODOS_LOS_USUARIOS);
    }

    /**
     * Obtiene la información de un usuario activo específico.
     * @param {number} id ID del usuario.
     */
    async ObtenerUsuarioPorId(id) {
        return await db.query(usuariosQueries.OBTENER_USUARIO_POR_ID, [id]);
    }

    /**
     * Obtiene la información de un usuario sin validar deleted_at.
     * @param {number} id ID del usuario.
     */
    async ObtenerUsuarioPorIdAdmin(id) {
        return await db.query(usuariosQueries.OBTENER_USUARIO_POR_ID_ADMIN, [id]);
    }

    /**
     * Busca usuarios cuyo correo coincida con el término de búsqueda para administración.
     * @param {string} correo Filtro de búsqueda por correo.
     */
    async BuscarUsuariosPorCorreoAdmin(correo) {
        return await db.query(usuariosQueries.BUSCAR_USUARIOS_POR_CORREO_ADMIN, [`%${correo}%`]);
    }

    /**
     * Actualiza la información de un usuario construyendo la consulta dinámicamente.
     * @param {number} id ID del usuario.
     * @param {object} datos Nuevos datos del usuario.
     */
    async ActualizarUsuarioAdmin(id, datos) {
        const campos = [];
        const valores = [];

        if (datos.nombre !== undefined) {
            valores.push(datos.nombre);
            campos.push(`nombre = $${valores.length}`);
        }

        if (datos.correo !== undefined) {
            valores.push(datos.correo);
            campos.push(`correo = $${valores.length}`);
        }

        if (datos.password !== undefined) {
            valores.push(datos.password);
            campos.push(`password = $${valores.length}`);
        }

        if (campos.length === 0) {
            return await this.ObtenerUsuarioPorId(id);
        }

        valores.push(id);
        const query = usuariosQueries.GENERAR_ACTUALIZACION_ADMIN(campos, valores.length);

        return await db.query(query, valores);
    }

    /**
     * Realiza un borrado lógico (Soft Delete) del usuario.
     * @param {number} id ID del usuario a deshabilitar.
     */
    async DeshabilitarUsuario(id) {
        return await db.query(usuariosQueries.DESHABILITAR_USUARIO, [id]);
    }
}

module.exports = new UsuariosModel();
