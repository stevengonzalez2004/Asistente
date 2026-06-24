// src/controllers/auth.controllers.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Asegúrate de tener estas funciones creadas en tu modelo
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
        const passwordValida = bcrypt.compareSync(password, usuario.password);

        if (!passwordValida) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
        }

        const payload = { id: usuario.id, correo: usuario.correo };
        const secret = process.env.JWT_SECRET || 'asistente-financiero-secret-2026';
    
        const token = jwt.sign(payload, secret, { expiresIn: '4h' });

        res.status(200).json({
            message: 'Login exitoso',
            token: token,
            usuario: { id: usuario.id, correo: usuario.correo, nombre: usuario.nombre }
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

        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync(password, salt);

        const datosNuevoUsuario = {
            nombre,
            correo,
            password: hashPassword
        };

        // Este método en el modelo hace un INSERT INTO usuarios (nombre, correo, password)
        await usuariosModel.RegistroCompleto(datosNuevoUsuario);

        res.status(201).json({ message: 'Registro exitoso. Ya puede iniciar sesión.' });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }
        next(error);
    }
};