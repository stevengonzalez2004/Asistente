/**
 * @file movimientosModel.js
 * @description Capa de modelo de negocio para movimientos financieros, interactuando con la base de datos a través de consultas centralizadas.
 */

const db = require('../config/db');
const logger = require('../utils/logger');
const movimientosQueries = require('../queries/movimientosQueries');
const { crearConstructorCondiciones, construirResultadoPaginado } = require('../utils/queryBuilder');
const { crearCache } = require('../utils/memCache');

const CLAVE_CACHE_CATEGORIAS = 'categorias';
const cacheCategorias = crearCache({ ttlMs: 10 * 60 * 1000 });

class MovimientosModel {
    /**
     * Busca un usuario por su telegram_id. Si no existe, delega su creación 
     * e inicialización completa a la función almacenada de Postgres.
     * @param {string} telegramId ID de Telegram del usuario.
     * @param {string} username Nombre de usuario de Telegram.
     * @param {string} nombre Nombre visible del usuario.
     */
    async buscarOCrearUsuario(telegramId, username, nombre) {
        try {
            const res = await db.query(movimientosQueries.BUSCAR_O_CREAR_USUARIO, [telegramId, username, nombre]);
            return res.rows[0];
        } catch (error) {
            logger.error('Error al invocar fx_buscar_o_crear_usuario:', error);
            throw error;
        }
    }

    /**
     * Busca un usuario activo por su id interno de base de datos.
     * @param {number} usuarioId ID interno de base de datos.
     */
    async buscarUsuarioPorId(usuarioId) {
        const res = await db.query(movimientosQueries.BUSCAR_USUARIO_POR_ID, [usuarioId]);
        return res.rows[0] || null;
    }

    /**
     * Registra un movimiento financiero usando el esquema real de la tabla movimientos.
     * Mantiene un control estricto de transacciones (BEGIN/COMMIT/ROLLBACK).
     * @param {object} datos Datos del movimiento financiero a registrar.
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
                movimientosQueries.OBTENER_TIPO_MOVIMIENTO_POR_NOMBRE,
                [tipoNormalizado]
            );

            if (tipoRes.rows.length === 0) {
                throw new Error(`Tipo de movimiento no válido: ${tipoNormalizado}`);
            }

            let categoriaRes = await client.query(
                movimientosQueries.OBTENER_CATEGORIA_POR_NOMBRE, 
                [categoriaNombre, usuario_id]
            );

            if (categoriaRes.rows.length === 0) {
                categoriaRes = await client.query(
                    movimientosQueries.CREAR_CATEGORIA,
                    [categoriaNombre, usuario_id]
                );
                this.invalidarCacheCategorias();
            }

            const obtenerCuenta = async (nombreCuenta) => {
                const nombreNormalizado = String(nombreCuenta || '').trim();
                if (!nombreNormalizado) return null;

                let cuentaRes = await client.query(
                    movimientosQueries.OBTENER_CUENTA_POR_NOMBRE, 
                    [nombreNormalizado, usuario_id]
                );

                if (cuentaRes.rows.length === 0) {
                    cuentaRes = await client.query(
                        movimientosQueries.CREAR_CUENTA, 
                        [nombreNormalizado, usuario_id]
                    );
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

            const movimientoRes = await client.query(movimientosQueries.INSERTAR_MOVIMIENTO, [
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
                    movimientosQueries.INCREMENTAR_SALDO_CUENTA,
                    [montoNumero, cuentaOrigen.id]
                );
            }

            if (tipoNormalizado === 'GASTO') {
                await client.query(
                    movimientosQueries.DECREMENTAR_SALDO_CUENTA,
                    [montoNumero, cuentaOrigen.id]
                );
            }

            if (tipoNormalizado === 'TRANSFERENCIA') {
                await client.query(
                    movimientosQueries.DECREMENTAR_SALDO_CUENTA,
                    [montoNumero, cuentaOrigen.id]
                );
                await client.query(
                    movimientosQueries.INCREMENTAR_SALDO_CUENTA,
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
     * Ejecuta el borrado lógico (Soft Delete) de un movimiento actualizando saldos asociados.
     * @param {number} movimientoId ID del movimiento a eliminar.
     * @param {number|null} usuarioId ID del usuario para filtro de seguridad.
     */
    async eliminarMovimientoWeb(movimientoId, usuarioId = null) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const params = [movimientoId];
            const conFiltroUsuario = !!usuarioId;
            if (usuarioId) params.push(usuarioId);

            const query = movimientosQueries.OBTENER_MOVIMIENTO_PARA_ELIMINAR(conFiltroUsuario);
            const movimientoRes = await client.query(query, params);

            if (movimientoRes.rows.length === 0) {
                const error = new Error('Movimiento no encontrado o ya eliminado.');
                error.status = 404;
                throw error;
            }

            const movimiento = movimientoRes.rows[0];
            const monto = Number(movimiento.monto || 0);

            if (movimiento.tipo === 'INGRESO' && movimiento.cuenta_origen_id) {
                await client.query(
                    movimientosQueries.DECREMENTAR_SALDO_CUENTA,
                    [monto, movimiento.cuenta_origen_id]
                );
            }

            if (movimiento.tipo === 'GASTO' && movimiento.cuenta_origen_id) {
                await client.query(
                    movimientosQueries.INCREMENTAR_SALDO_CUENTA,
                    [monto, movimiento.cuenta_origen_id]
                );
            }

            if (movimiento.tipo === 'TRANSFERENCIA') {
                if (movimiento.cuenta_origen_id) {
                    await client.query(
                        movimientosQueries.INCREMENTAR_SALDO_CUENTA,
                        [monto, movimiento.cuenta_origen_id]
                    );
                }

                if (movimiento.cuenta_destino_id) {
                    await client.query(
                        movimientosQueries.DECREMENTAR_SALDO_CUENTA,
                        [monto, movimiento.cuenta_destino_id]
                    );
                }
            }

            await client.query(
                movimientosQueries.SOFT_DELETE_MOVIMIENTO,
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
     * @param {number} usuarioId ID del usuario.
     */
    async listarCuentas(usuarioId) {
        const res = await db.query(movimientosQueries.LISTAR_CUENTAS, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene una cuenta por nombre o la crea para el usuario indicado.
     * @param {string} nombre Nombre de la cuenta.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerOCrearCuenta(nombre, usuarioId) {
        const nombreNormalizado = String(nombre || '').trim();
        if (!nombreNormalizado || !usuarioId) {
            throw new Error('El nombre de la cuenta y el usuario son obligatorios.');
        }

        const existente = await db.query(movimientosQueries.OBTENER_CUENTA_DETALLADA, [nombreNormalizado, usuarioId]);

        if (existente.rows.length > 0) {
            return existente.rows[0];
        }

        const creada = await db.query(movimientosQueries.CREAR_CUENTA_DETALLADA, [nombreNormalizado, usuarioId]);

        return creada.rows[0];
    }

    /**
     * Crea una cuenta para el usuario sin duplicarla si ya existe.
     * @param {string} nombre Nombre de la cuenta.
     * @param {number} usuarioId ID del usuario.
     */
    async crearCuentaParaUsuario(nombre, usuarioId) {
        const nombreNormalizado = String(nombre || '').trim();
        if (!nombreNormalizado || !usuarioId) {
            throw new Error('El nombre de la cuenta y el usuario son obligatorios.');
        }

        const existente = await db.query(movimientosQueries.OBTENER_CUENTA_DETALLADA, [nombreNormalizado, usuarioId]);

        if (existente.rows.length > 0) {
            return { creado: false, cuenta: existente.rows[0] };
        }

        const creada = await db.query(movimientosQueries.CREAR_CUENTA_DETALLADA, [nombreNormalizado, usuarioId]);

        return { creado: true, cuenta: creada.rows[0] };
    }

    /**
     * Obtiene el balance total (suma de todas las cuentas).
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerBalanceTotal(usuarioId) {
        const res = await db.query(movimientosQueries.OBTENER_BALANCE_TOTAL, [usuarioId]);
        return parseFloat(res.rows[0]?.balance_total || 0);
    }

    /**
     * Obtiene el resumen de movimientos del día de hoy.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerResumenHoy(usuarioId) {
        const res = await db.query(movimientosQueries.OBTENER_RESUMEN_HOY, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene el resumen de movimientos del mes en curso.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerResumenMes(usuarioId) {
        const res = await db.query(movimientosQueries.OBTENER_RESUMEN_MES, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene la suma de gastos por categoría en el mes actual.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerGastosCategoriaMes(usuarioId) {
        const res = await db.query(movimientosQueries.OBTENER_GASTOS_CATEGORIA_MES, [usuarioId]);
        return res.rows;
    }

    /**
     * Edita un movimiento existente y recalcula los saldos de las cuentas involucradas.
     * @param {number} movimientoId ID del movimiento.
     * @param {number} usuarioId ID del usuario propietario.
     * @param {object} datos Datos nuevos del movimiento.
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
            const res = await db.query(movimientosQueries.EDITAR_MOVIMIENTO, [
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
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerHistorial(usuarioId) {
        try {
            const res = await db.query(movimientosQueries.OBTENER_HISTORIAL, [usuarioId]);
            return res.rows;
        } catch (error) {
            logger.error('Error al invocar fx_listar_historial_movimientos:', error);
            throw error;
        }
    }

    /**
     * Obtiene el historial de movimientos para administración.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerHistorialPorUsuarioAdmin(usuarioId) {
        return await this.obtenerHistorial(usuarioId);
    }

    /**
     * Version paginada del historial de un usuario (opt-in): a diferencia de
     * obtenerHistorial/obtenerHistorialPorUsuarioAdmin (fijas a los ultimos 100 via
     * fx_listar_historial_movimientos), permite pedir cualquier pagina reutilizando
     * listarMovimientosGlobalPaginado filtrado por usuarioId (mismas filas/orden que la
     * funcion almacenada, verificado). No reemplaza los metodos existentes.
     * @param {object} opts { usuarioId, page, limit }
     */
    async obtenerHistorialPaginado({ usuarioId, page = 1, limit = 100 } = {}) {
        return this.listarMovimientosGlobalPaginado({
            usuarioId, page, limit, sortBy: 'fecha', sortDir: 'desc', estado: 'activo',
        });
    }

    /**
     * Lista movimientos de TODOS los usuarios, paginados/ordenables/filtrables, para administración.
     * @param {object} opts { page, limit, sortBy, sortDir, usuarioId, categoria, tipo, montoMin, montoMax, estado, fechaDesde, fechaHasta, q }
     */
    async listarMovimientosGlobalPaginado({
        page = 1, limit = 20, sortBy = 'fecha', sortDir = 'desc',
        usuarioId, categoria, tipo, montoMin, montoMax, estado = 'activo',
        fechaDesde, fechaHasta, q,
    } = {}) {
        const { condiciones, valores, agregar, paginar } = crearConstructorCondiciones();

        if (estado === 'activo') condiciones.push('m.deleted_at IS NULL');
        else if (estado === 'eliminado') condiciones.push('m.deleted_at IS NOT NULL');
        // estado === 'todos' -> sin condición sobre deleted_at

        if (usuarioId) agregar('u.id = ?', usuarioId);
        if (categoria) agregar('cat.nombre = ?', categoria);
        if (tipo) agregar('tm.nombre = ?', String(tipo).toUpperCase());
        if (montoMin !== undefined && montoMin !== null && montoMin !== '' && !isNaN(montoMin)) {
            agregar('m.monto >= ?', montoMin);
        }
        if (montoMax !== undefined && montoMax !== null && montoMax !== '' && !isNaN(montoMax)) {
            agregar('m.monto <= ?', montoMax);
        }
        if (fechaDesde) agregar('m.fecha >= ?', fechaDesde);
        if (fechaHasta) agregar('m.fecha < ?', fechaHasta);

        if (q) {
            agregar('(m.descripcion ILIKE ? OR u.nombre ILIKE ? OR u.correo ILIKE ? OR cat.nombre ILIKE ?)', `%${q}%`);
        }

        const ordenColumna = movimientosQueries.COLUMNAS_ORDENABLES_MOVIMIENTOS_GLOBAL[sortBy] || 'm.fecha';
        const ordenDireccion = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const { indexLimit, indexOffset } = paginar(page, limit);

        const query = movimientosQueries.GENERAR_LISTADO_PAGINADO_MOVIMIENTOS_GLOBAL({
            condiciones, ordenColumna, ordenDireccion, indexLimit, indexOffset,
        });

        const resultado = await db.query(query, valores);
        return construirResultadoPaginado(resultado, page, limit);
    }

    /**
     * Lista alfabética de nombres de categorías existentes (para el filtro del panel global).
     */
    async listarCategoriasDistintas() {
        return cacheCategorias.get(CLAVE_CACHE_CATEGORIAS, async () => {
            const res = await db.query(movimientosQueries.OBTENER_CATEGORIAS_DISTINCT);
            return res.rows.map((r) => r.nombre);
        });
    }

    /** Invalida el cache de categorias distintas (llamar tras crear una categoria nueva). */
    invalidarCacheCategorias() {
        cacheCategorias.invalidate(CLAVE_CACHE_CATEGORIAS);
    }

    /**
     * Obtiene un movimiento completo por ID (activo únicamente) para operaciones de administración.
     * @param {number} movimientoId
     */
    async obtenerMovimientoCompletoPorId(movimientoId) {
        const res = await db.query(movimientosQueries.OBTENER_MOVIMIENTO_COMPLETO_POR_ID, [movimientoId]);
        return res.rows[0] || null;
    }
}

module.exports = new MovimientosModel();
