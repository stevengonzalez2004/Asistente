import { Injectable } from '@angular/core';
import { Cuenta, FinanzaStore, Movimiento } from './models';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly storageKey = 'asistente-financiero-store';

  constructor() {
    this.ensureStore();
  }

  getStore(): FinanzaStore {
    return this.readStore();
  }

  getAccounts(userId: string): Cuenta[] {
    const store = this.readStore();
    return store.accountsByUser[userId] ?? [];
  }

  getMovements(userId: string): Movimiento[] {
    const store = this.readStore();
    return store.movementsByUser[userId] ?? [];
  }

  addAccount(userId: string, nombre: string): Cuenta {
    const store = this.readStore();
    const cuenta: Cuenta = {
      id: crypto.randomUUID(),
      nombre,
      saldo_actual: 0
    };

    const accounts = store.accountsByUser[userId] ?? [];
    accounts.push(cuenta);
    store.accountsByUser[userId] = accounts;
    this.writeStore(store);
    return cuenta;
  }

  addMovement(userId: string, movement: Omit<Movimiento, 'id'>): Movimiento {
    const store = this.readStore();
    const newMovement: Movimiento = {
      ...movement,
      id: crypto.randomUUID()
    };

    const movements = store.movementsByUser[userId] ?? [];
    movements.unshift(newMovement);
    store.movementsByUser[userId] = movements;

    const account = (store.accountsByUser[userId] ?? []).find((item) => item.nombre === movement.cuenta);
    if (account) {
      const delta = movement.tipo === 'INGRESO' ? movement.monto : movement.tipo === 'GASTO' ? -movement.monto : 0;
      account.saldo_actual = Number((account.saldo_actual + delta).toFixed(2));
    }

    this.writeStore(store);
    return newMovement;
  }

  getSummary(userId: string) {
    const movements = this.getMovements(userId);
    const ingresos = movements.filter((m) => m.tipo === 'INGRESO').reduce((sum, item) => sum + item.monto, 0);
    const gastos = movements.filter((m) => m.tipo === 'GASTO').reduce((sum, item) => sum + item.monto, 0);
    const balance = ingresos - gastos;
    return { ingresos, gastos, balance, totalMovimientos: movements.length };
  }

  private ensureStore(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      const store: FinanzaStore = {
        users: [],
        accountsByUser: {},
        movementsByUser: {}
      };
      localStorage.setItem(this.storageKey, JSON.stringify(store));
    }
  }

  private readStore(): FinanzaStore {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      this.ensureStore();
      return this.readStore();
    }

    return JSON.parse(raw) as FinanzaStore;
  }

  private writeStore(store: FinanzaStore): void {
    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }
}
