/**
 * @file csv.js
 * @description Utilidades mínimas y sin dependencias para generar texto CSV con escape RFC 4180.
 */

function escaparCampoCsv(valor) {
    if (valor === null || valor === undefined) return '';
    const texto = String(valor);
    if (/[",\n\r]/.test(texto)) {
        return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
}

function filasACsv(encabezados, filas) {
    const lineas = [encabezados.map(escaparCampoCsv).join(',')];
    for (const fila of filas) {
        lineas.push(fila.map(escaparCampoCsv).join(','));
    }
    return lineas.join('\r\n');
}

module.exports = { escaparCampoCsv, filasACsv };
