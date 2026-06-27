// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

exports.verificarToken = (req, res, next) => {
    // 1. Obtener el token de las cabeceras (Formato esperado: "Bearer eyJhbGci...")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // 2. Si no enviaron token, se rechaza la petición inmediatamente
    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // 3. Desencriptar y verificar el token usando la firma secreta
        const secret = process.env.JWT_SECRET || 'asistente-financiero-secret-2026';
        const payload = jwt.verify(token, secret);

        // 4. Inyectar los datos del usuario desencriptados en la petición (req)
        req.usuario = payload;

        // 5. Dejar que la petición continúe
        next();
    } catch (error) {
        // Si el token fue modificado, es falso, o expiró
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
}; // 🟢 Aquí debe cerrar verificarToken

// 🟢 Esta función debe estar completamente fuera de la anterior
exports.verificarAdmin = (req, res, next) => {
    // Asumimos que verificarToken ya se ejecutó antes y req.usuario existe
    if (req.usuario.rol !== 'ADMIN') {
        return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next(); // Si es ADMIN, lo dejamos pasar
};