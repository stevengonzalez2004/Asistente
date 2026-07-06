const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuariosModel = require('../models/usuariosModel');
// Asumo que tu compañero creó un servicio para enviar los correos
const authService = require('../services/authService');
const logger = require('../utils/logger');

// ==========================================
// 1. LOGIN Y REGISTRO
// ==========================================

/**
 * Autentica un usuario por correo/password y emite un JWT.
 * @route POST /api/auth/login
 */
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

        await usuariosModel.ActualizarUltimoLogin(usuario.id);

        const payload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
        const secret = process.env.JWT_SECRET
        if (!secret) {
    throw new Error('ERROR CRÍTICO: La variable JWT_SECRET no está definida en las variables de entorno.');
}
        const token = jwt.sign(payload, secret, { expiresIn: '4h' });

        logger.info(`Login exitoso: usuario ${usuario.id} (${usuario.correo}).`);
        res.status(200).json({
            message: 'Login exitoso',
            token,
            usuario: { id: usuario.id, correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol }
        });
    } catch (error) {
        logger.error('Error en login:', error);
        next(error);
    }
};

/**
 * Registra un nuevo usuario publico (self-service).
 * @route POST /api/auth/registro
 */
exports.registroPublico = async (req, res, next) => {
    try {
        const { nombre, correo, password } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        await usuariosModel.RegistroCompleto({ nombre, correo, password: hashPassword });

        logger.info(`Registro publico exitoso: ${correo}.`);
        res.status(201).json({ message: 'Registro exitoso. Ya puede iniciar sesión.' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ message: 'El correo ya está registrado' });
        logger.error('Error en registro publico:', error);
        next(error);
    }
};

// ==========================================
// 2. RECUPERACIÓN DE CONTRASEÑA
// ==========================================

/**
 * Envia (o simula el envio de) un codigo de recuperacion de contraseña al correo indicado.
 * @route POST /api/auth/recuperar-password
 */
exports.solicitarRecuperacion = async (req, res, next) => {
    try {
        const { correo } = req.body;
        if (!correo) return res.status(400).json({ message: 'El correo es requerido' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const resultado = await authService.solicitarRecuperacion(correo);
        logger.info(`Codigo de recuperacion solicitado para ${correo}.`);
        res.status(200).json({ message: resultado.message });
    } catch (error) {
        logger.error('Error al solicitar recuperacion de password:', error);
        next(error);
    }
};

/**
 * Verifica el codigo de recuperacion enviado al correo del usuario.
 * @route POST /api/auth/verificar-codigo
 */
exports.verificarCodigo = async (req, res, next) => {
    try {
        const { correo, codigoIngresado } = req.body;
        if (!correo || !codigoIngresado) return res.status(400).json({ message: 'Correo y código son requeridos' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const resultado = await authService.verificarCodigo(correo, codigoIngresado);
        res.status(200).json({ message: resultado.message });
    } catch (error) {
        logger.error('Error al verificar codigo de recuperacion:', error);
        next(error);
    }
};

/**
 * Cambia la contraseña del usuario tras verificar el codigo de recuperacion.
 * @route POST /api/auth/cambiar-password
 */
exports.cambiarContrasena = async (req, res, next) => {
    try {
        const { correo, nuevaContrasena } = req.body;
        if (!correo || !nuevaContrasena) return res.status(400).json({ message: 'Correo y nueva contraseña son requeridos' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        // 🔒 CIBERSEGURIDAD: Encriptamos la nueva contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(nuevaContrasena, salt);

        await authService.cambiarContrasena(correo, hashPassword);
        logger.info(`Contraseña actualizada via recuperacion para ${correo}.`);
        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        logger.error('Error al cambiar password:', error);
        next(error);
    }
};
