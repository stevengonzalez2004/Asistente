export type RolUsuario = 'ADMIN' | 'ADMINISTRADOR' | 'USER' | 'USUARIO' | string;

export interface Usuario {
  id: number;
  nombre: string | null;
  correo: string;
  rol: RolUsuario;
  telegram_id?: number | null;
  deleted_at?: string | null;
}

export interface Movimiento {
  id: number;
  tipo?: string;
  tipo_movimiento?: string;
  categoria?: string | null;
  monto: number | string;
  cuenta_origen?: string | null;
  cuenta_destino?: string | null;
  descripcion?: string | null;
  metodo_pago?: string | null;
  fecha?: string;
}

export interface Cuenta {
  id?: number;
  nombre: string;
  saldo_actual: number | string;
}

export interface BalanceUsuario {
  balance_total: number | string;
  balanceTotal?: number | string;
  cuentas: Cuenta[];
}

export interface LoginResponse {
  message: string;
  token: string;
  usuario: Usuario;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MovimientoPayload {
  categoria?: string | null;
  monto: number;
  cuenta_origen?: string | null;
  cuenta_destino?: string | null;
  descripcion?: string | null;
  metodo_pago?: string | null;
}

export interface CrearMovimientoPayload extends MovimientoPayload {
  tipo: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';
}
