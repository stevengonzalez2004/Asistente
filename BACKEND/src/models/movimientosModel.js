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
     * Registra un movimiento financiero usando el esquema real de la tabla movimientos.
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

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const tipoNormalizado = String(tipo || '').trim().toUpperCase();
            const montoNumero = Number(monto);
            const categoriaNombre = String(categoria || 'Otros').trim();

            const tipoRes = await client.query(
                'SELECT id, nombre FROM tipos_movimiento WHERE UPPER(nombre) = $1 LIMIT 1;',
                [tipoNormalizado]
            );

            if (tipoRes.rows.length === 0) {
                throw new Error(`Tipo de movimiento no válido: ${tipoNormalizado}`);
            }

            let categoriaRes = await client.query(`
                SELECT id, nombre
                FROM categorias
                WHERE LOWER(nombre) = LOWER($1)
                  AND (usuario_id = $2 OR usuario_id IS NULL)
                ORDER BY usuario_id NULLS FIRST
                LIMIT 1;
            `, [categoriaNombre, usuario_id]);

            if (categoriaRes.rows.length === 0) {
                categoriaRes = await client.query(`
                    INSERT INTO categorias (nombre, usuario_id)
                    VALUES ($1, $2)
                    RETURNING id, nombre;
                `, [categoriaNombre, usuario_id]);
            }

            const obtenerCuenta = async (nombreCuenta) => {
                const nombreNormalizado = String(nombreCuenta || '').trim();
                if (!nombreNormalizado) return null;

                let cuentaRes = await client.query(`
                    SELECT id, nombre, saldo_actual
                    FROM cuentas
                    WHERE LOWER(nombre) = LOWER($1)
                      AND usuario_id = $2
                    LIMIT 1;
                `, [nombreNormalizado, usuario_id]);

                if (cuentaRes.rows.length === 0) {
                    cuentaRes = await client.query(`
                        INSERT INTO cuentas (nombre, usuario_id)
                        VALUES ($1, $2)
                        RETURNING id, nombre, saldo_actual;
                    `, [nombreNormalizado, usuario_id]);
                }

                return cuentaRes.rows[0];
            };

            const cuentaOrigen = await obtenerCuenta(cuenta_origen);
            const cuentaDestino = await obtenerCuenta(cuenta_destino);

            if ((tipoNormalizado === 'INGRESO' || tipoNormalizado === 'GASTO') && !cuentaOrigen) {
                throw new Error('La cuenta origen es obligatoria para ingresos y gastos.');
            }

            if (tipoNormalizado === 'TRANSFERENCIA' && (!cuentaOrigen || !cuentaDestino)) {
                throw new Error('La cuenta origen y destino son obligatorias para transferencias.');
            }

            const movimientoRes = await client.query(`
                INSERT INTO movimientos (
                    usuario_id,
                    tipo_movimiento_id,
                    categoria_id,
                    cuenta_origen_id,
                    cuenta_destino_id,
                    monto,
                    descripcion,
                    metodo_pago
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, usuario_id, monto, descripcion, metodo_pago, fecha;
            `, [
                usuario_id,
                tipoRes.rows[0].id,
                categoriaRes.rows[0].id,
                cuentaOrigen?.id || null,
                cuentaDestino?.id || null,
                montoNumero,
                descripcion,
                metodo_pago
            ]);

            if (tipoNormalizado === 'INGRESO') {
                await client.query(
                    'UPDATE cuentas SET saldo_actual = saldo_actual + $1 WHERE id = $2;',
                    [montoNumero, cuentaOrigen.id]
                );
            }

            if (tipoNormalizado === 'GASTO') {
                await client.query(
                    'UPDATE cuentas SET saldo_actual = saldo_actual - $1 WHERE id = $2;',
                    [montoNumero, cuentaOrigen.id]
                );
            }

            if (tipoNormalizado === 'TRANSFERENCIA') {
                await client.query(
                    'UPDATE cuentas SET saldo_actual = saldo_actual - $1 WHERE id = $2;',
                    [montoNumero, cuentaOrigen.id]
                );
                await client.query(
                    'UPDATE cuentas SET saldo_actual = saldo_actual + $1 WHERE id = $2;',
                    [montoNumero, cuentaDestino.id]
                );
            }

            await client.query('COMMIT');

            return {
                ...movimientoRes.rows[0],
                tipo: tipoNormalizado,
                categoria: categoriaNombre,
                cuenta_origen: cuentaOrigen?.nombre || null,
                cuenta_destino: cuentaDestino?.nombre || null
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error al registrar movimiento:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Ejecuta el borrado lógico (Soft Delete) de un movimiento utilizando el procedimiento almacenado.
     */
    async eliminarMovimientoWeb(movimientoId, usuarioId = null) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const params = [movimientoId];
            const filtroUsuario = usuarioId ? 'AND m.usuario_id = $2' : '';
            if (usuarioId) params.push(usuarioId);

            const movimientoRes = await client.query(`
                SELECT
                    m.id,
                    m.monto,
                    m.cuenta_origen_id,
                    m.cuenta_destino_id,
                    tm.nombre AS tipo
                FROM movimientos m
                JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
                WHERE m.id = $1
                  ${filtroUsuario}
                  AND m.deleted_at IS NULL
                FOR UPDATE;
            `, params);

            if (movimientoRes.rows.length === 0) {
                const error = new Error('Movimiento no encontrado o ya eliminado.');
                error.status = 404;
                throw error;
            }

            const movimiento = movimientoRes.rows[0];
            const monto = Number(movimiento.monto || 0);

            if (movimiento.tipo === 'INGRESO' && movimiento.cuenta_origen_id) {
                await client.query(
                    'UPDATE cuentas SET saldo_actual = saldo_actual - $1 WHERE id = $2',
                    [monto, movimiento.cuenta_origen_id]
                );
            }

            if (movimiento.tipo === 'GASTO' && movimiento.cuenta_origen_id) {
                await client.query(
                    'UPDATE cuentas SET saldo_actual = saldo_actual + $1 WHERE id = $2',
                    [monto, movimiento.cuenta_origen_id]
                );
            }

            if (movimiento.tipo === 'TRANSFERENCIA') {
                if (movimiento.cuenta_origen_id) {
                    await client.query(
                        'UPDATE cuentas SET saldo_actual = saldo_actual + $1 WHERE id = $2',
                        [monto, movimiento.cuenta_origen_id]
                    );
                }

                if (movimiento.cuenta_destino_id) {
                    await client.query(
                        'UPDATE cuentas SET saldo_actual = saldo_actual - $1 WHERE id = $2',
                        [monto, movimiento.cuenta_destino_id]
                    );
                }
            }

            await client.query(
                'UPDATE movimientos SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
                [movimientoId]
            );

            await client.query('COMMIT');
            return { success: true, message: 'Movimiento enviado a la papelera correctamente.' };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error al ejecutar el procedimiento soft_delete_movimiento:', error);
            throw error;
        } finally {
            client.release();
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
     * Obtiene una cuenta por nombre o la crea para el usuario indicado.
     */
    async obtenerOCrearCuenta(nombre, usuarioId) {
        const nombreNormalizado = String(nombre || '').trim();
        if (!nombreNormalizado || !usuarioId) {
            throw new Error('El nombre de la cuenta y el usuario son obligatorios.');
        }

        const existente = await db.query(`
            SELECT id, nombre, usuario_id, saldo_actual, created_at
            FROM cuentas
            WHERE LOWER(nombre) = LOWER($1)
              AND usuario_id = $2
            LIMIT 1;
        `, [nombreNormalizado, usuarioId]);

        if (existente.rows.length > 0) {
            return existente.rows[0];
        }

        const creada = await db.query(`
            INSERT INTO cuentas (nombre, usuario_id)
            VALUES ($1, $2)
            RETURNING id, nombre, usuario_id, saldo_actual, created_at;
        `, [nombreNormalizado, usuarioId]);

        return creada.rows[0];
    }

    /**
     * Crea una cuenta para el usuario sin duplicarla si ya existe.
     */
    async crearCuentaParaUsuario(nombre, usuarioId) {
        const nombreNormalizado = String(nombre || '').trim();
        if (!nombreNormalizado || !usuarioId) {
            throw new Error('El nombre de la cuenta y el usuario son obligatorios.');
        }

        const existente = await db.query(`
            SELECT id, nombre, usuario_id, saldo_actual, created_at
            FROM cuentas
            WHERE LOWER(nombre) = LOWER($1)
              AND usuario_id = $2
            LIMIT 1;
        `, [nombreNormalizado, usuarioId]);

        if (existente.rows.length > 0) {
            return { creado: false, cuenta: existente.rows[0] };
        }

        const creada = await db.query(`
            INSERT INTO cuentas (nombre, usuario_id)
            VALUES ($1, $2)
            RETURNING id, nombre, usuario_id, saldo_actual, created_at;
        `, [nombreNormalizado, usuarioId]);

        return { creado: true, cuenta: creada.rows[0] };
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

    async obtenerHistorialPorUsuarioAdmin(usuarioId) {
        return await this.obtenerHistorial(usuarioId);
    }
}

module.exports = new MovimientosModel();
