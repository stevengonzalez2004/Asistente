const movimientosModel = require('../models/movimientosModel');
const logger = require('../utils/logger');

class MovimientosService {
  /**
   * Registra un movimiento financiero para un usuario.
   * @param {Object} data - Datos del movimiento (usuario_id, telegram_id, etc).
   */
  async registrarMovimiento(data, validarSaldo = false) {
    const {
      telegram_id,
      username,
      nombre,
      tipo,
      categoria,
      monto,
      cuenta_origen,
      cuenta_destino,
      descripcion,
      metodo_pago
    } = data;

    // 1. Validaciones básicas
    if (!telegram_id) {
      throw new Error('El ID de Telegram del usuario es requerido.');
    }
    if (!tipo || !['INGRESO', 'GASTO', 'TRANSFERENCIA'].includes(tipo.toUpperCase())) {
      throw new Error(`Tipo de movimiento no válido: ${tipo}`);
    }
    if (!monto || isNaN(monto) || parseFloat(monto) <= 0) {
      throw new Error('El monto debe ser un número mayor a cero.');
    }

    // 2. Buscar o crear el usuario en la BD
    const usuario = await movimientosModel.buscarOCrearUsuario(telegram_id, username, nombre);
    
    // 3. Normalizar cuentas por tipo
    let cuentaOrigenNorm = cuenta_origen;
    let cuentaDestinoNorm = cuenta_destino;

    if (tipo === 'GASTO' && !cuentaOrigenNorm) {
      cuentaOrigenNorm = 'Efectivo'; // Fallback
    } else if (tipo === 'INGRESO' && !cuentaOrigenNorm) {
      // Usaremos cuenta_origen para registrar dónde entra el ingreso
      cuentaOrigenNorm = cuenta_destino || 'Efectivo';
    }

    // --- Validación de saldo ---
    if (validarSaldo && !data.forzar && (tipo === 'GASTO' || tipo === 'TRANSFERENCIA')) {
      const cuentaObj = await movimientosModel.obtenerOCrearCuenta(cuentaOrigenNorm, usuario.id);
      const saldoActual = parseFloat(cuentaObj?.saldo_actual || 0);
      const montoFloat = parseFloat(monto);

      if (saldoActual < montoFloat) {
        return {
          status: 'SALDO_INSUFICIENTE',
          cuenta: cuentaOrigenNorm,
          saldoActual,
          faltante: montoFloat - saldoActual,
          datosMovimiento: { ...data, cuenta_origen: cuentaOrigenNorm }
        };
      }
    }

    // 4. Preparar payload para la BD
    const payload = {
      usuario_id: usuario.id,
      tipo: tipo.toUpperCase(),
      categoria: categoria || 'Otros',
      monto: parseFloat(monto),
      cuenta_origen: cuentaOrigenNorm,
      cuenta_destino: cuentaDestinoNorm,
      descripcion: descripcion || (tipo === 'TRANSFERENCIA' ? `Transferencia a ${cuentaDestinoNorm}` : `Movimiento de ${categoria || 'Otros'}`),
      metodo_pago: metodo_pago || (tipo === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'EFECTIVO')
    };

    logger.debug('Registrando movimiento con payload:', payload);
    const resultado = await movimientosModel.registrarMovimiento(payload);
    
    return {
      status: 'OK',
      usuario,
      movimiento: resultado
    };
  }

  /**
   * Asegura la existencia de un usuario (y crea cuentas si no existen).
   * No registra ningún movimiento ficticio.
   */
  async asegurarUsuario(telegramId, username, nombre) {
    if (!telegramId) throw new Error('El ID de Telegram es requerido.');
    return await movimientosModel.buscarOCrearUsuario(telegramId, username, nombre);
  }

  /**
   * Obtiene las cuentas del usuario y sus saldos.
   */
  async listarCuentasUsuario(telegramId) {
    if (!telegramId) throw new Error('El ID de Telegram es requerido.');
    const usuario = await movimientosModel.buscarOCrearUsuario(telegramId);
    const cuentas = await movimientosModel.listarCuentas(usuario.id);
    const balanceTotal = await movimientosModel.obtenerBalanceTotal(usuario.id);
    
    return {
      cuentas,
      balanceTotal
    };
  }
}

module.exports = new MovimientosService();
