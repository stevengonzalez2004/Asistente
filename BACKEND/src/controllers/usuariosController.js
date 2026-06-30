const usuariosModel = require('../models/usuariosModel');

class UsuariosController {
    // ==========================================
    // GESTIÓN DE USUARIOS (Panel Admin)
    // ==========================================
    
    // Listar todos los usuarios activos
    async listarUsuarios(req, res, next) {
        try {
            const resultados = await usuariosModel.ObtenerTodosLosUsuarios();
            res.status(200).json({ success: true, data: resultados.rows });
        } catch (error) { next(error); }
    }

    // Obtener usuario por ID
    async obtenerUsuarioPorId(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario inválido' });

            const resultado = await usuariosModel.ObtenerUsuarioPorId(idUsuario);
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            res.status(200).json({ success: true, data: resultado.rows[0] });
        } catch (error) { next(error); }
    }

    // Deshabilitar usuario (Soft Delete)
    async deshabilitarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            if (!idUsuario || isNaN(idUsuario)) return res.status(400).json({ message: 'ID de usuario inválido' });

            const existe = await usuariosModel.ObtenerUsuarioPorId(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            await usuariosModel.DeshabilitarUsuario(idUsuario);
            res.status(200).json({ success: true, message: 'Usuario deshabilitado correctamente' });
        } catch (error) { next(error); }
    }
}

module.exports = new UsuariosController();