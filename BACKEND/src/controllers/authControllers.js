// src/controllers/auth.Controllers.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuariosModel = require('../models/usuariosModel');

// ==========================================
// LOGIN 
// ==========================================
exports.login = async (req, res, next) => {
    try {
        const { correo, password } = req.body;

        const resultado = await usuariosModel.BuscarPorCorreo(correo);

        if (resultado.rows.length === 0) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
        }

        const usuario = resultado.rows[0];
        
        // Cambio a asíncrono para no bloquear el Event Loop
        const passwordValida = await bcrypt.compare(password, usuario.password);

        if (!passwordValida) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
        }

        const payload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
        const secret = process.env.JWT_SECRET || 'asistente-financiero-secret-2026';

        const token = jwt.sign(payload, secret, { expiresIn: '4h' });

        res.status(200).json({
            message: 'Login exitoso',
            token: token,
            usuario: { id: usuario.id, correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol }
        });

    } catch (error) {
        next(error);
    }
};

// ==========================================
// REGISTRO 
// ==========================================
exports.registroPublico = async (req, res, next) => {
    try {
        const { nombre, correo, password } = req.body;

        // Cambio a asíncrono para escalar mejor con múltiples usuarios concurrentes
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const datosNuevoUsuario = {
            nombre,
            correo,
            password: hashPassword
        };

        // Llama a fx_registro_completo en la base de datos
        await usuariosModel.RegistroCompleto(datosNuevoUsuario);

        res.status(201).json({ message: 'Registro exitoso. Ya puede iniciar sesión.' });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }
        next(error);
    }
};