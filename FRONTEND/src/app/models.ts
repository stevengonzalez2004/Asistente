export interface Usuario {
  id: string;
  nombre: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Cuenta {
  id: string;
  nombre: string;
  saldo_actual: number;
}

export interface Movimiento {
  id: string;
  descripcion: string;
  monto: number;
  tipo: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';
  categoria: string;
  cuenta: string;
  fecha: string;
}

export interface FinanzaStore {
  users: Usuario[];
  accountsByUser: Record<string, Cuenta[]>;
  movementsByUser: Record<string, Movimiento[]>;
}
