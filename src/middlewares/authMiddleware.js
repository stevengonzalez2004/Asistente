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
        // 3. Desencriptar y verificar el token usando la firma secreta del .env
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Inyectar los datos del usuario desencriptados en la petición (req)
        // El payload contiene lo que se puso en el controlador: { id, correo }
        req.usuario = payload; 
        
        // 5. Dejar que la petición continúe hacia el controlador
        next();
    } catch (error) {
        // Si el token fue modificado, es falso, o pasaron las 4 horas de expiración
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
};