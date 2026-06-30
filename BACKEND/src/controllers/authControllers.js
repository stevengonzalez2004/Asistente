const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuariosModel = require('../models/usuariosModel');
// Asumo que tu compañero creó un servicio para enviar los correos
const authService = require('../services/authService'); 

// ==========================================
// 1. LOGIN Y REGISTRO
// ==========================================
exports.login = async (req, res, next) => {
    try {
        const { correo, password } = req.body;
        const resultado = await usuariosModel.BuscarPorCorreo(correo);

        if (resultado.rows.length === 0) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
        }

        const usuario = resultado.rows[0];
        const passwordValida = await bcrypt.compare(password, usuario.password);

        if (!passwordValida) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
        }

        const payload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
        const secret = process.env.JWT_SECRET
        if (!secret) {
    throw new Error('ERROR CRÍTICO: La variable JWT_SECRET no está definida en las variables de entorno.');
}
        const token = jwt.sign(payload, secret, { expiresIn: '4h' });

        res.status(200).json({
            message: 'Login exitoso',
            token,
            usuario: { id: usuario.id, correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol }
        });
    } catch (error) { next(error); }
};

exports.registroPublico = async (req, res, next) => {
    try {
        const { nombre, correo, password } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        await usuariosModel.RegistroCompleto({ nombre, correo, password: hashPassword });

        res.status(201).json({ message: 'Registro exitoso. Ya puede iniciar sesión.' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ message: 'El correo ya está registrado' });
        next(error);
    }
};

// ==========================================
// 2. RECUPERACIÓN DE CONTRASEÑA
// ==========================================
exports.solicitarRecuperacion = async (req, res, next) => {
    try {
        const { correo } = req.body;
        if (!correo) return res.status(400).json({ message: 'El correo es requerido' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const resultado = await authService.solicitarRecuperacion(correo);
        res.status(200).json({ message: resultado.message });
    } catch (error) { next(error); }
};

exports.verificarCodigo = async (req, res, next) => {
    try {
        const { correo, codigoIngresado } = req.body;
        if (!correo || !codigoIngresado) return res.status(400).json({ message: 'Correo y código son requeridos' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const resultado = await authService.verificarCodigo(correo, codigoIngresado);
        res.status(200).json({ message: resultado.message });
    } catch (error) { next(error); }
};

exports.cambiarContrasena = async (req, res, next) => {
    try {
        const { correo, nuevaContrasena } = req.body;
        if (!correo || !nuevaContrasena) return res.status(400).json({ message: 'Correo y nueva contraseña son requeridos' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        // 🔒 CIBERSEGURIDAD: Encriptamos la nueva contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(nuevaContrasena, salt);

        const resultado = await authService.cambiarContrasena(correo, hashPassword);
        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) { next(error); }
};