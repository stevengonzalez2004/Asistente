const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const usuariosModel = require('../models/usuariosModel');
const logger = require('../utils/logger');

class AuthService {
    async enviarCorreo(destinatario, mensaje) {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('Faltan variables SMTP en .env');
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        return transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: destinatario,
            subject: 'Código de recuperación - Asistente Financiero',
            text: mensaje,
        });
    }

    async solicitarRecuperacion(correo) {
        // Genera un código de 6 dígitos
        const codigoLimpio = crypto.randomInt(100000, 999999).toString();
        const salt = await bcrypt.genSalt(10);
        const codigoHasheado = await bcrypt.hash(codigoLimpio, salt);
        
        // Expiración en 15 minutos
        const tiempoExpiracion = new Date(Date.now() + 15 * 60 * 1000);

        await usuariosModel.GuardarCodigoRecuperacion(correo, codigoHasheado, tiempoExpiracion);
        
        await this.enviarCorreo(correo, `Tu código de recuperación es: ${codigoLimpio}\nEste código expirará en 15 minutos.`);

        return { message: 'Código enviado con éxito a tu correo.' };
    }

    async verificarCodigo(correo, codigoIngresado) {
        const usuario = await usuariosModel.ObtenerDatosRecuperacion(correo);
        
        if (!usuario || !usuario.codigo_recuperacion) {
            throw new Error('Petición inválida o código no solicitado.');
        }

        if (new Date() > new Date(usuario.codigo_expiracion)) {
            throw new Error('El código ha expirado.');
        }

        const codigoValido = await bcrypt.compare(codigoIngresado, usuario.codigo_recuperacion);
        if (!codigoValido) {
            throw new Error('Código incorrecto.');
        }

        await usuariosModel.MarcarCodigoVerificado(correo);
        return { message: 'Código verificado con éxito. Procede a cambiar tu contraseña.' };
    }

    async cambiarContrasena(correo, hashNuevaPassword) {
        const usuario = await usuariosModel.ObtenerDatosRecuperacion(correo);

        if (!usuario || !usuario.codigo_verificacion) {
            throw new Error('Acción no autorizada. Debes verificar el código primero.');
        }

        await usuariosModel.ActualizarPasswordYLimpiar(correo, hashNuevaPassword);
        return { message: 'Contraseña actualizada correctamente.' };
    }
}

module.exports = new AuthService();