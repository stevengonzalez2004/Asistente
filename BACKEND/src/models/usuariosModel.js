// src/models/usuariosModel.js
const db = require('../config/db');

class UsuariosModel {
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
}

module.exports = new UsuariosModel();