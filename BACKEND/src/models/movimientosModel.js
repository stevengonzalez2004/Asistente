const db = require('../config/db');
const logger = require('../utils/logger');

class MovimientosModel {
    /**
     * Busca un usuario por su telegram_id. Si no existe, delega su creación 
     * e inicialización completa a la función almacenada de Postgres.
     */
    async buscarOCrearUsuario(telegramId, username, nombre) {
        try {
            const query = 'SELECT * FROM fx_buscar_o_crear_usuario($1, $2, $3);';
            const res = await db.query(query, [telegramId, username, nombre]);
            return res.rows[0];
        } catch (error) {
            logger.error('Error al invocar fx_buscar_o_crear_usuario:', error);
            throw error;
        }
    }

    /**
     * Busca un usuario activo por su id interno de base de datos.
     */
    async buscarUsuarioPorId(usuarioId) {
        const res = await db.query(`
            SELECT id, telegram_id, username, nombre, correo, rol, created_at
            FROM usuarios
            WHERE id = $1 AND deleted_at IS NULL;
        `, [usuarioId]);
        return res.rows[0] || null;
    }

    /**
     * Registra un movimiento financiero ejecutando todas las comprobaciones, 
     * mapeos de nombres a IDs y flujos relacionales en una sola consulta SQL.
     */
    async registrarMovimiento(datos) {
        const {
            usuario_id,
            tipo, 
            categoria,
            monto,
            cuenta_origen,
            cuenta_destino,
            descripcion,
            metodo_pago
        } = datos;

        try {
            const query = 'SELECT * FROM fx_registrar_movimiento($1, $2, $3, $4, $5, $6, $7, $8);';
            const res = await db.query(query, [
                usuario_id,
                tipo,
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            ]);
            
            return {
                ...res.rows[0],
                tipo,
                categoria: categoria || null,
                cuenta_origen: cuenta_origen || null,
                cuenta_destino: cuenta_destino || null
            };
        } catch (error) {
            logger.error('Error al registrar movimiento mediante fx_registrar_movimiento:', error);
            throw error;
        }
    }

    /**
     * Ejecuta el borrado lógico (Soft Delete) de un movimiento utilizando el procedimiento almacenado.
     */
    async eliminarMovimientoWeb(movimientoId) {
        try {
            const query = 'CALL soft_delete_movimiento($1);';
            await db.query(query, [movimientoId]);
            return { success: true, message: 'Movimiento enviado a la papelera correctamente.' };
        } catch (error) {
            logger.error('Error al ejecutar el procedimiento soft_delete_movimiento:', error);
            throw error;
        }
    }

    /**
     * Obtiene la lista de cuentas de un usuario con sus saldos.
     */
    async listarCuentas(usuarioId) {
        const query = 'SELECT * FROM fx_listar_cuentas_usuario($1);';
        const res = await db.query(query, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene el balance total (suma de todas las cuentas).
     */
    async obtenerBalanceTotal(usuarioId) {
        // Usamos "AS balance_total" para que el controlador lo lea igual que antes
        const query = 'SELECT fx_obtener_balance_general($1) AS balance_total;';
        const res = await db.query(query, [usuarioId]);
        return parseFloat(res.rows[0]?.balance_total || 0);
    }

    /**
     * Obtiene el resumen de movimientos del día de hoy.
     */
    async obtenerResumenHoy(usuarioId) {
        const query = 'SELECT * FROM fx_obtener_resumen_hoy($1);';
        const res = await db.query(query, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene el resumen de movimientos del mes en curso.
     */
    async obtenerResumenMes(usuarioId) {
        const query = 'SELECT * FROM fx_obtener_resumen_mes($1);';
        const res = await db.query(query, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene la suma de gastos por categoría en el mes actual.
     */
    async obtenerGastosCategoriaMes(usuarioId) {
        const query = 'SELECT * FROM fx_obtener_gastos_categoria_mes($1);';
        const res = await db.query(query, [usuarioId]);
        return res.rows;
    }
    /**
     * Edita un movimiento existente y recalcula los saldos de las cuentas involucradas.
     */
    async editarMovimiento(movimientoId, usuarioId, datos) {
        const {
            categoria,
            monto,
            cuenta_origen,
            cuenta_destino,
            descripcion,
            metodo_pago
        } = datos;

        try {
            const query = 'SELECT * FROM fx_editar_movimiento($1, $2, $3, $4, $5, $6, $7, $8);';
            const res = await db.query(query, [
                movimientoId,
                usuarioId,
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            ]);
            
            return res.rows[0];
        } catch (error) {
            logger.error('Error al editar movimiento:', error);
            throw error;
        }
    }
    /**
     * Obtiene el historial de los últimos 100 movimientos de un usuario.
     * Delegado completamente a la función fx_listar_historial_movimientos en PostgreSQL.
     */
    async obtenerHistorial(usuarioId) {
        try {
            const query = 'SELECT * FROM fx_listar_historial_movimientos($1);';
            const res = await db.query(query, [usuarioId]);
            return res.rows;
        } catch (error) {
            logger.error('Error al invocar fx_listar_historial_movimientos:', error);
            throw error;
        }
    }
}

module.exports = new MovimientosModel();