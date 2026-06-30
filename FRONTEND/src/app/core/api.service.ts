import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  ApiResponse,
  BalanceUsuario,
  CrearMovimientoPayload,
  Cuenta,
  Movimiento,
  MovimientoPayload,
  Usuario,
} from './models';

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  listarUsuarios(): Observable<Usuario[]> {
    return this.http
      .get<ApiResponse<Usuario[]>>(`${API_URL}/usuarios`)
      .pipe(map((response) => response.data));
  }

  buscarUsuariosPorCorreo(correo: string): Observable<Usuario[]> {
    return this.http
      .get<ApiResponse<Usuario[]>>(`${API_URL}/usuarios/buscar`, { params: { correo } })
      .pipe(map((response) => response.data));
  }

  actualizarUsuario(id: number, payload: Partial<Usuario> & { password?: string }): Observable<Usuario> {
    return this.http
      .put<ApiResponse<Usuario>>(`${API_URL}/usuarios/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  deshabilitarUsuario(id: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${API_URL}/usuarios/${id}`);
  }

  obtenerCuentasUsuario(usuarioId: number): Observable<BalanceUsuario> {
    return this.http
      .get<ApiResponse<BalanceUsuario>>(`${API_URL}/usuarios/${usuarioId}/cuentas`)
      .pipe(map((response) => response.data));
  }

  listarMovimientosUsuario(usuarioId: number): Observable<Movimiento[]> {
    return this.http
      .get<ApiResponse<Movimiento[]>>(`${API_URL}/usuarios/${usuarioId}/movimientos`)
      .pipe(map((response) => response.data));
  }

  actualizarMovimiento(
    usuarioId: number,
    movimientoId: number,
    payload: MovimientoPayload,
  ): Observable<Movimiento> {
    return this.http
      .put<ApiResponse<Movimiento>>(`${API_URL}/usuarios/${usuarioId}/movimientos/${movimientoId}`, payload)
      .pipe(map((response) => response.data));
  }

  eliminarMovimiento(usuarioId: number, movimientoId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${API_URL}/usuarios/${usuarioId}/movimientos/${movimientoId}`);
  }

  obtenerMisCuentas(): Observable<BalanceUsuario> {
    return this.http.get<ApiResponse<BalanceUsuario>>(`${API_URL}/movimientos/cuentas`).pipe(
      map((response) => {
        const balance = response.data;
        return {
          ...balance,
          balance_total: balance.balance_total ?? balance.balanceTotal ?? 0,
          cuentas: balance.cuentas || [],
        };
      }),
    );
  }

  crearCuenta(nombre: string): Observable<Cuenta> {
    return this.http
      .post<ApiResponse<Cuenta>>(`${API_URL}/movimientos/cuentas`, { nombre })
      .pipe(map((response) => response.data));
  }

  listarMisMovimientos(): Observable<Movimiento[]> {
    return this.http
      .get<ApiResponse<Movimiento[]>>(`${API_URL}/movimientos`)
      .pipe(map((response) => response.data));
  }

  registrarMovimiento(payload: CrearMovimientoPayload): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${API_URL}/movimientos`, payload)
      .pipe(map((response) => response.data));
  }
}
