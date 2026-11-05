// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db'); 

exports.verificarToken = async (req, res, next) => { 
    // 1. Obtener el token de las cabeceras (Formato esperado: "Bearer eyJhbGci...")
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // 2. Si no enviaron token, se rechaza la petición inmediatamente
    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // 3. Desencriptar y verificar el token usando la firma secreta
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('ERROR CRÍTICO: La variable JWT_SECRET no está definida en las variables de entorno.');
        }
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });

        // 4.  EL PARCHE (Cierra el DEF-07): Verificar si el usuario sigue activo en la BD
        const usuarioDB = await db.query(
            'SELECT id, rol, telegram_id, correo FROM usuarios WHERE id = $1 AND deleted_at IS NULL', 
            [payload.id] // El JWT trae el ID del usuario
        );

        if (usuarioDB.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Acceso denegado. La cuenta ha sido deshabilitada o eliminada.' 
            });
        }

        // 5. Inyectar los datos frescos y verificados en la petición (req)
        req.usuario = usuarioDB.rows[0];

        // 6. Dejar que la petición continúe
        next();
    } catch (error) {
        // Si el token fue modificado, es falso, expiró, o falló la BD
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};

exports.verificarAdmin = (req, res, next) => {
    // Asumimos que verificarToken ya se ejecutó antes y req.usuario existe
    if (!['ADMIN', 'ADMINISTRADOR'].includes(req.usuario.rol)) {
        return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next(); // Si es ADMIN, lo dejamos pasar
};
