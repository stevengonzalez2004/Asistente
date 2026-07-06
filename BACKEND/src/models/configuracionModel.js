// src/models/configuracionModel.js
const db = require('../config/db');
const configuracionQueries = require('../queries/configuracionQueries');
const { crearCache } = require('../utils/memCache');

const PATRON_IDENTIFICADOR_SEGURO = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const CLAVE_CACHE = 'config';
const cacheConfiguracion = crearCache({ ttlMs: 5 * 60 * 1000 });

class ConfiguracionModel {
    /**
     * Obtiene el conjunto real de columnas de una tabla directamente de la BD
     * (information_schema), en vez de mantener una lista estatica que podria desincronizarse
     * del esquema real (confirmado: schema.sql esta desactualizado respecto a la BD viva).
     * @param {import('pg').PoolClient} client
     * @param {string} tabla Nombre de tabla, siempre proveniente del whitelist TABLAS_RESPALDO.
     * @returns {Promise<Set<string>>}
     */
    async _obtenerColumnasReales(client, tabla) {
        const res = await client.query(
            'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
            [tabla]
        );
        return new Set(res.rows.map((fila) => fila.column_name));
    }

    /**
     * Valida que cada clave de una fila de restauracion sea un identificador seguro y
     * corresponda a una columna real de la tabla, antes de usarla en un INSERT dinamico
     * (los valores ya viajan parametrizados; esto protege los NOMBRES de columna, que no).
     * @param {string[]} columnas
     * @param {Set<string>} columnasPermitidas
     * @param {string} tabla
     */
    _validarColumnas(columnas, columnasPermitidas, tabla) {
        for (const columna of columnas) {
            if (!PATRON_IDENTIFICADOR_SEGURO.test(columna) || !columnasPermitidas.has(columna)) {
                throw new Error(`Columna no permitida en la tabla "${tabla}": "${columna}".`);
            }
        }
    }

    /**
     * Devuelve toda la configuracion como un objeto plano { clave: valor }.
     */
    async obtenerConfiguracion() {
        return cacheConfiguracion.get(CLAVE_CACHE, async () => {
            const res = await db.query(configuracionQueries.SELECT_ALL);
            return res.rows.reduce((acumulado, fila) => {
                acumulado[fila.clave] = fila.valor;
                return acumulado;
            }, {});
        });
    }

    /**
     * Actualiza (upsert) uno o mas pares clave/valor dentro de una transaccion.
     * @param {Record<string, string>} cambios
     */
    async actualizarConfiguracion(cambios) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            for (const [clave, valor] of Object.entries(cambios)) {
                await client.query(configuracionQueries.UPSERT, [clave, valor === undefined || valor === null ? '' : String(valor)]);
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        cacheConfiguracion.invalidate(CLAVE_CACHE);
        return this.obtenerConfiguracion();
    }

    /**
     * Exporta el contenido completo de las tablas propias de la app como un respaldo JSON.
     */
    async exportarDatos() {
        const resultado = {};
        for (const tabla of configuracionQueries.TABLAS_RESPALDO) {
            const res = await db.query(`SELECT * FROM ${tabla}`);
            resultado[tabla] = res.rows;
        }
        resultado.exportado_en = new Date().toISOString();
        return resultado;
    }

    /**
     * Restaura las tablas propias de la app desde un respaldo JSON, reemplazando su contenido
     * actual por completo dentro de una unica transaccion (todo o nada).
     * @param {Record<string, object[]>} payload
     */
    async restaurarDatos(payload) {
        for (const tabla of configuracionQueries.TABLAS_RESPALDO) {
            if (!Array.isArray(payload[tabla])) {
                throw new Error(`El respaldo no contiene la tabla esperada: ${tabla}`);
            }
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // TRUNCATE (no DELETE): 'movimientos' tiene un trigger que bloquea el borrado
            // fisico por fila (trigger_seguro_movimientos); TRUNCATE no dispara triggers de
            // fila y ademas reinicia las secuencias serial (RESTART IDENTITY) automaticamente.
            await client.query(configuracionQueries.TRUNCATE_RESPALDO);

            for (const tabla of configuracionQueries.TABLAS_RESPALDO) {
                const filas = payload[tabla];
                const columnasPermitidas = await this._obtenerColumnasReales(client, tabla);

                for (const fila of filas) {
                    const columnas = Object.keys(fila);
                    if (columnas.length === 0) continue;
                    this._validarColumnas(columnas, columnasPermitidas, tabla);
                    const marcadores = columnas.map((_, indice) => `$${indice + 1}`).join(', ');
                    const valores = columnas.map((columna) => fila[columna]);
                    await client.query(
                        `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${marcadores})`,
                        valores
                    );
                }

                // Realinea la secuencia del id serial con el maximo id restaurado (RESTART
                // IDENTITY la deja en 1, pero los ids restaurados pueden ser mayores).
                await client.query(
                    `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${tabla}), 1), true)`,
                    [tabla]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        cacheConfiguracion.invalidate(CLAVE_CACHE); // restaurarDatos tambien reemplaza 'configuracion'
        return { restaurado: true };
    }
}

module.exports = new ConfiguracionModel();
