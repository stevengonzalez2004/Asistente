const db = require('../config/db');
const queries = require('../queries/movimientosQueries');
const logger = require('../utils/logger');

class MovimientosModel {
    /**
     * Busca un usuario por su telegram_id. Si no existe, lo crea y le asigna cuentas por defecto.
     */
    async buscarOCrearUsuario(telegramId, username, nombre) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const resBusqueda = await client.query(queries.buscarUsuarioPorTelegramId, [telegramId]);
            if (resBusqueda.rows.length > 0) {
                await client.query('COMMIT');
                return resBusqueda.rows[0];
            }

            logger.info(`Registrando nuevo usuario de Telegram: ${telegramId} (${nombre || username})`);
            const resInsercion = await client.query(queries.insertarUsuario, [telegramId, username, nombre]);
            const nuevoUsuario = resInsercion.rows[0];

            // Cuentas por defecto
            const cuentasDefecto = ['Efectivo', 'Tarjeta', 'Banco', 'Ahorros'];
            for (const cuenta of cuentasDefecto) {
                await client.query(queries.insertarCuenta, [cuenta, nuevoUsuario.id, 0.00]);
            }

            await client.query('COMMIT');
            return nuevoUsuario;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error al buscar o crear usuario:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Busca un usuario por su id interno.
     */
    async buscarUsuarioPorId(usuarioId) {
        const res = await db.query(`
      SELECT id, telegram_id, username, nombre, created_at
      FROM usuarios
      WHERE id = $1;
    `, [usuarioId]);
        return res.rows[0] || null;
    }

    /**
     * Crea una cuenta para un usuario si no existe.
     */
    async crearCuentaParaUsuario(nombre, usuarioId) {
        if (!nombre || !usuarioId) {
            throw new Error('El nombre de la cuenta y el usuario son obligatorios.');
        }

        const nombreNormalizado = nombre.trim();
        const resBusqueda = await db.query(queries.buscarCuentaPorNombreYUsuario, [nombreNormalizado, usuarioId]);
        if (resBusqueda.rows.length > 0) {
            return { cuenta: resBusqueda.rows[0], creado: false };
        }

        const resInsercion = await db.query(queries.insertarCuenta, [nombreNormalizado, usuarioId, 0.00]);
        return { cuenta: resInsercion.rows[0], creado: true };
    }

    /**
     * Obtiene o crea una categoría si no existe.
     */
    async obtenerOCrearCategoria(nombre, usuarioId) {
        if (!nombre) return null;
        const nombreNormalizado = nombre.trim();

        // Primero buscar (en las globales o en las del usuario)
        const resBusqueda = await db.query(queries.buscarCategoriaPorNombreYUsuario, [nombreNormalizado, usuarioId]);
        if (resBusqueda.rows.length > 0) {
            return resBusqueda.rows[0];
        }

        // Si no existe, crear una personalizada para el usuario
        const resInsercion = await db.query(queries.insertarCategoria, [nombreNormalizado, usuarioId]);
        return resInsercion.rows[0];
    }

    /**
     * Obtiene o crea una cuenta por nombre.
     */
    async obtenerOCrearCuenta(nombre, usuarioId) {
        if (!nombre) return null;
        const nombreNormalizado = nombre.trim();

        const resBusqueda = await db.query(queries.buscarCuentaPorNombreYUsuario, [nombreNormalizado, usuarioId]);
        if (resBusqueda.rows.length > 0) {
            return resBusqueda.rows[0];
        }

        // Crear cuenta con saldo inicial en 0 si no existe
        const resInsercion = await db.query(queries.insertarCuenta, [nombreNormalizado, usuarioId, 0.00]);
        return resInsercion.rows[0];
    }

    /**
     * Registra un movimiento financiero y actualiza los saldos de las cuentas en una transacción.
     */
    async registrarMovimiento(datos) {
        const {
            usuario_id,
            tipo, // 'INGRESO', 'GASTO', 'TRANSFERENCIA'
            categoria,
            monto,
            cuenta_origen,
            cuenta_destino,
            descripcion,
            metodo_pago
        } = datos;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Obtener Tipo de Movimiento ID
            const resTipo = await client.query(queries.buscarTipoMovimientoPorNombre, [tipo]);
            if (resTipo.rows.length === 0) {
                throw new Error(`Tipo de movimiento inválido: ${tipo}`);
            }
            const tipoId = resTipo.rows[0].id;

            // 2. Obtener o crear Categoría ID
            let categoriaId = null;
            if (categoria) {
                const catObj = await this.obtenerOCrearCategoria(categoria, usuario_id);
                categoriaId = catObj.id;
            }

            // 3. Obtener o crear Cuentas
            let cuentaOrigenObj = null;
            let cuentaDestinoObj = null;

            if (cuenta_origen) {
                cuentaOrigenObj = await this.obtenerOCrearCuenta(cuenta_origen, usuario_id);
            }
            if (cuenta_destino) {
                cuentaDestinoObj = await this.obtenerOCrearCuenta(cuenta_destino, usuario_id);
            }

            const cuentaOrigenId = cuentaOrigenObj.id || null;
            const cuentaDestinoId = cuentaDestinoObj.id || null;

            // 4. Insertar Movimiento
            const resMov = await client.query(queries.insertarMovimiento, [
                usuario_id,
                tipoId,
                categoriaId,
                cuentaOrigenId,
                cuentaDestinoId,
                monto,
                descripcion,
                metodo_pago
            ]);
            const nuevoMovimiento = resMov.rows[0];

            // 5. Actualizar Saldos de Cuentas
            if (tipo === 'GASTO') {
                if (!cuentaOrigenId) throw new Error('Se requiere cuenta de origen para un gasto.');
                await client.query(queries.actualizarSaldoCuenta, [-monto, cuentaOrigenId]);
            } else if (tipo === 'INGRESO') {
                if (!cuentaOrigenId) throw new Error('Se requiere cuenta para depositar el ingreso.');
                await client.query(queries.actualizarSaldoCuenta, [monto, cuentaOrigenId]);
            } else if (tipo === 'TRANSFERENCIA') {
                if (!cuentaOrigenId || !cuentaDestinoId) {
                    throw new Error('Se requieren cuentas de origen y destino para una transferencia.');
                }
                // Restar de origen y sumar a destino
                await client.query(queries.actualizarSaldoCuenta, [-monto, cuentaOrigenId]);
                await client.query(queries.actualizarSaldoCuenta, [monto, cuentaDestinoId]);
            }

            await client.query('COMMIT');
            return {
                ...nuevoMovimiento,
                tipo,
                categoria: categoria || null,
                cuenta_origen: cuenta_origen || null,
                cuenta_destino: cuenta_destino || null
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error al registrar movimiento en base de datos:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtiene la lista de cuentas de un usuario con sus saldos.
     */
    async listarCuentas(usuarioId) {
        const res = await db.query(queries.listarCuentasUsuario, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene el balance total (suma de todas las cuentas).
     */
    async obtenerBalanceTotal(usuarioId) {
        const res = await db.query(queries.obtenerBalanceGeneral, [usuarioId]);
        return parseFloat(res.rows[0].balance_total || 0);
    }

    /**
     * Obtiene el resumen de movimientos del día de hoy.
     */
    async obtenerResumenHoy(usuarioId) {
        const res = await db.query(queries.obtenerResumenHoy, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene el resumen de movimientos del mes en curso.
     */
    async obtenerResumenMes(usuarioId) {
        const res = await db.query(queries.obtenerResumenMes, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene la suma de gastos por categoría en el mes actual.
     */
    async obtenerGastosCategoriaMes(usuarioId) {
        const res = await db.query(queries.obtenerGastosPorCategoriaMes, [usuarioId]);
        return res.rows;
    }
}

module.exports = new MovimientosModel();