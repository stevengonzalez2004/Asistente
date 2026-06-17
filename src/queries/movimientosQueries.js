module.exports = {
  // --- USUARIOS ---
  buscarUsuarioPorTelegramId: `
    SELECT id, telegram_id, username, nombre, created_at 
    FROM usuarios 
    WHERE telegram_id = $1;
  `,

  insertarUsuario: `
    INSERT INTO usuarios (telegram_id, username, nombre) 
    VALUES ($1, $2, $3) 
    RETURNING id, telegram_id, username, nombre, created_at;
  `,

  // --- CUENTAS ---
  buscarCuentaPorNombreYUsuario: `
    SELECT id, nombre, usuario_id, saldo_actual 
    FROM cuentas 
    WHERE LOWER(nombre) = LOWER($1) AND usuario_id = $2;
  `,

  insertarCuenta: `
    INSERT INTO cuentas (nombre, usuario_id, saldo_actual) 
    VALUES ($1, $2, $3) 
    RETURNING id, nombre, usuario_id, saldo_actual;
  `,

  actualizarSaldoCuenta: `
    UPDATE cuentas 
    SET saldo_actual = saldo_actual + $1 
    WHERE id = $2 
    RETURNING id, nombre, saldo_actual;
  `,

  listarCuentasUsuario: `
    SELECT id, nombre, saldo_actual 
    FROM cuentas 
    WHERE usuario_id = $1 
    ORDER BY nombre ASC;
  `,

  // --- CATEGORÍAS ---
  buscarCategoriaPorNombreYUsuario: `
    SELECT id, nombre, usuario_id 
    FROM categorias 
    WHERE LOWER(nombre) = LOWER($1) AND (usuario_id = $2 OR usuario_id IS NULL)
    ORDER BY usuario_id DESC NULLS LAST
    LIMIT 1;
  `,

  insertarCategoria: `
    INSERT INTO categorias (nombre, usuario_id) 
    VALUES ($1, $2) 
    ON CONFLICT (nombre, usuario_id) DO NOTHING
    RETURNING id, nombre, usuario_id;
  `,

  listarCategoriasUsuario: `
    SELECT id, nombre, usuario_id 
    FROM categorias 
    WHERE usuario_id = $1 OR usuario_id IS NULL 
    ORDER BY nombre ASC;
  `,

  // --- TIPOS DE MOVIMIENTO ---
  buscarTipoMovimientoPorNombre: `
    SELECT id, nombre 
    FROM tipos_movimiento 
    WHERE nombre = $1;
  `,

  // --- MOVIMIENTOS ---
  insertarMovimiento: `
    INSERT INTO movimientos (usuario_id, tipo_movimiento_id, categoria_id, cuenta_origen_id, cuenta_destino_id, monto, descripcion, metodo_pago) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING id, usuario_id, tipo_movimiento_id, categoria_id, cuenta_origen_id, cuenta_destino_id, monto, descripcion, metodo_pago, fecha;
  `,

  obtenerBalanceGeneral: `
    SELECT COALESCE(SUM(saldo_actual), 0) AS balance_total 
    FROM cuentas 
    WHERE usuario_id = $1;
  `,

  obtenerResumenHoy: `
    SELECT 
      m.id, 
      tm.nombre AS tipo, 
      c.nombre AS categoria, 
      m.monto, 
      m.descripcion, 
      co.nombre AS cuenta_origen,
      cd.nombre AS cuenta_destino,
      m.fecha
    FROM movimientos m
    JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
    LEFT JOIN categorias c ON m.categoria_id = c.id
    LEFT JOIN cuentas co ON m.cuenta_origen_id = co.id
    LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
    WHERE m.usuario_id = $1 AND m.fecha::date = CURRENT_DATE
    ORDER BY m.fecha DESC;
  `,

  obtenerResumenMes: `
    SELECT 
      m.id, 
      tm.nombre AS tipo, 
      c.nombre AS categoria, 
      m.monto, 
      m.descripcion, 
      m.fecha
    FROM movimientos m
    JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
    LEFT JOIN categorias c ON m.categoria_id = c.id
    WHERE m.usuario_id = $1 
      AND m.fecha >= DATE_TRUNC('month', CURRENT_DATE) 
      AND m.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    ORDER BY m.fecha DESC;
  `,

  obtenerGastosPorCategoriaMes: `
    SELECT 
      COALESCE(c.nombre, 'Sin categoría') AS categoria, 
      SUM(m.monto) AS total
    FROM movimientos m
    JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
    LEFT JOIN categorias c ON m.categoria_id = c.id
    WHERE m.usuario_id = $1 
      AND tm.nombre = 'GASTO'
      AND m.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY c.nombre
    ORDER BY total DESC;
  `
};
