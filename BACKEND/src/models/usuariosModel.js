// src/models/usuariosModel.js
const db = require('../config/db');

class UsuariosModel {
    // ==========================================
    // MÉTODOS DE AUTENTICACIÓN Y REGISTRO
    // ==========================================

    /**
     * Busca un usuario delegando la consulta a fx_buscar_por_correo.
     */
    async BuscarPorCorreo(correo) {
        const query = 'SELECT * FROM fx_buscar_por_correo($1);';
        return await db.query(query, [correo]);
    }

    /**
     * Registra un nuevo usuario delegando la inserción a fx_registro_completo.
     */
    async RegistroCompleto(datos) {
        const { nombre, correo, password } = datos;
        const query = 'SELECT * FROM fx_registro_completo($1, $2, $3);';
        
        const resultado = await db.query(query, [nombre, correo, password]);
        return resultado.rows[0];
    }

    /**
     * Vincula la cuenta delegando la actualización a fx_vincular_cuenta_web.
     */
    async VincularCuentaWeb(telegramId, correo, passwordHash) {
        const query = 'SELECT * FROM fx_vincular_cuenta_web($1, $2, $3);';
        const resultado = await db.query(query, [telegramId, correo, passwordHash]);
        return resultado.rows[0];
    }

    // ==========================================
    // MÉTODOS DE RECUPERACIÓN DE CONTRASEÑA
    // ==========================================

    /**
     * Guarda el hash del código de recuperación y su fecha de expiración.
     */
    async GuardarCodigoRecuperacion(correo, codigoHasheado, expiracion) {
        const query = 'UPDATE usuarios SET codigo_recuperacion = $1, codigo_expiracion = $2 WHERE correo = $3';
        return await db.query(query, [codigoHasheado, expiracion, correo]);
    }

    /**
     * Obtiene los datos de recuperación actuales del usuario.
     */
    async ObtenerDatosRecuperacion(correo) {
        const query = 'SELECT codigo_recuperacion, codigo_expiracion, codigo_verificacion FROM usuarios WHERE correo = $1';
        const res = await db.query(query, [correo]);
        return res.rows[0];
    }

    /**
     * Autoriza al usuario a cambiar su contraseña tras validar el código.
     */
    async MarcarCodigoVerificado(correo) {
        const query = 'UPDATE usuarios SET codigo_verificacion = true WHERE correo = $1';
        return await db.query(query, [correo]);
    }

    /**
     * Guarda la nueva contraseña y limpia los campos temporales de recuperación.
     */
    async ActualizarPasswordYLimpiar(correo, nuevaPasswordHash) {
        const query = `
            UPDATE usuarios
            SET password = $1,
                codigo_recuperacion = NULL,
                codigo_expiracion = NULL,
                codigo_verificacion = false
            WHERE correo = $2
        `;
        return await db.query(query, [nuevaPasswordHash, correo]);
    }

    // ==========================================
    // MÉTODOS DE ADMINISTRACIÓN (Panel Web)
    // ==========================================

    /**
     * Lista todos los usuarios activos del sistema.
     */
    async ObtenerTodosLosUsuarios() {
        const query = 'SELECT id, nombre, correo, rol, telegram_id, deleted_at FROM usuarios WHERE deleted_at IS NULL ORDER BY id ASC';
        return await db.query(query);
    }

    /**
     * Obtiene la información de un usuario específico.
     */
    async ObtenerUsuarioPorId(id) {
        const query = 'SELECT id, nombre, correo, rol, telegram_id, deleted_at FROM usuarios WHERE id = $1 AND deleted_at IS NULL';
        return await db.query(query, [id]);
    }

    async ObtenerUsuarioPorIdAdmin(id) {
        const query = 'SELECT id, nombre, correo, rol, telegram_id, deleted_at FROM usuarios WHERE id = $1';
        return await db.query(query, [id]);
    }

    async BuscarUsuariosPorCorreoAdmin(correo) {
        const query = `
            SELECT id, nombre, correo, rol, telegram_id, deleted_at
            FROM usuarios
            WHERE correo ILIKE $1
            ORDER BY deleted_at IS NULL DESC, id ASC
            LIMIT 50
        `;
        return await db.query(query, [`%${correo}%`]);
    }

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
        const query = `
            UPDATE usuarios
            SET ${campos.join(', ')}
            WHERE id = $${valores.length} AND deleted_at IS NULL
            RETURNING id, nombre, correo, rol, telegram_id
        `;

        return await db.query(query, valores);
    }

    /**
     * Realiza un borrado lógico (Soft Delete) del usuario.
     */
    async DeshabilitarUsuario(id) {
        const query = 'UPDATE usuarios SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1';
        return await db.query(query, [id]);
    }
}

module.exports = new UsuariosModel();
