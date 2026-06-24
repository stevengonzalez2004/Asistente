-- Crear base de datos (Ejecutar manualmente si es necesario)
-- CREATE DATABASE asistente_financiero;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(100),
    nombre VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Tipos de Movimiento
CREATE TABLE IF NOT EXISTS tipos_movimiento (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

-- 3. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (nombre, usuario_id)
);

-- 4. Tabla de Cuentas
CREATE TABLE IF NOT EXISTS cuentas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
    saldo_actual NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (nombre, usuario_id)
);

-- 5. Tabla de Movimientos
CREATE TABLE IF NOT EXISTS movimientos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
    tipo_movimiento_id INT REFERENCES tipos_movimiento(id) NOT NULL,
    categoria_id INT REFERENCES categorias(id),
    cuenta_origen_id INT REFERENCES cuentas(id),
    cuenta_destino_id INT REFERENCES cuentas(id),
    monto NUMERIC(15, 2) NOT NULL,
    descripcion TEXT,
    metodo_pago VARCHAR(50),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Semillar datos iniciales
INSERT INTO tipos_movimiento (nombre) VALUES 
('INGRESO'), 
('GASTO'), 
('TRANSFERENCIA')
ON CONFLICT (nombre) DO NOTHING;

-- Categorías por defecto (Globales, con usuario_id = NULL)
INSERT INTO categorias (nombre, usuario_id) VALUES 
('Comida', NULL),
('Transporte', NULL),
('Servicios', NULL),
('Salud', NULL),
('Entretenimiento', NULL),
('Educación', NULL),
('Compras', NULL),
('Salario', NULL),
('Inversión', NULL),
('Otros', NULL)
ON CONFLICT (nombre, usuario_id) DO NOTHING;
