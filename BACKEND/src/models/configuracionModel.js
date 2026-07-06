// src/models/configuracionModel.js
const db = require('../config/db');
const configuracionQueries = require('../queries/configuracionQueries');

class ConfiguracionModel {
    /**
     * Devuelve toda la configuracion como un objeto plano { clave: valor }.
     */
    async obtenerConfiguracion() {
        const res = await db.query(configuracionQueries.SELECT_ALL);
        return res.rows.reduce((acumulado, fila) => {
            acumulado[fila.clave] = fila.valor;
            return acumulado;
        }, {});
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
                for (const fila of filas) {
                    const columnas = Object.keys(fila);
                    if (columnas.length === 0) continue;
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

        return { restaurado: true };
    }
}

module.exports = new ConfiguracionModel();
