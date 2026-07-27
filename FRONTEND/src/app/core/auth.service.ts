import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, throwError } from 'rxjs';
import { LoginResponse, RefreshResponse, Usuario } from './models';

import { environment } from '../../environments/environment';

const API_URL = environment.apiBaseUrl;
const TOKEN_KEY = 'asistente_financiero_token';
const REFRESH_TOKEN_KEY = 'asistente_financiero_refresh_token';
const USER_KEY = 'asistente_financiero_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuario = signal<Usuario | null>(this.readUser());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { correo, password }).pipe(
      tap((response) => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
        this.usuario.set(response.usuario);
      }),
    );
  }

  loginConGoogle(credential: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/google`, { credential }).pipe(
      tap((response) => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
        this.usuario.set(response.usuario);
      }),
    );
  }

  /** Renueva el access token usando el refresh token almacenado. Usado por el interceptor ante un 401/403. */
  refreshToken(): Observable<RefreshResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible.'));
    }
    return this.http.post<RefreshResponse>(`${API_URL}/auth/refresh`, { refreshToken }).pipe(
      tap((response) => localStorage.setItem(TOKEN_KEY, response.token)),
    );
  }

  registrar(nombre: string, correo: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/register`, {
      nombre,
      correo,
      password,
    });
  }

  solicitarRecuperacion(correo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/recuperar-password`, { correo });
  }

  verificarCodigo(correo: string, codigoIngresado: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/verificar-codigo`, {
      correo,
      codigoIngresado,
    });
  }

  cambiarPassword(correo: string, nuevaContrasena: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/cambiar-password`, {
      correo,
      nuevaContrasena,
    });
  }

  actualizarUsuarioLocal(datos: Partial<Usuario>): void {
    const actual = this.usuario();
    if (!actual) return;
    const actualizado = { ...actual, ...datos };
    localStorage.setItem(USER_KEY, JSON.stringify(actualizado));
    this.usuario.set(actualizado);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.usuario.set(null);
    this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAdmin(): boolean {
    return ['ADMIN', 'ADMINISTRADOR'].includes(this.rolActual());
  }

  isUser(): boolean {
    return ['USER', 'USUARIO'].includes(this.rolActual());
  }

  private rolActual(): string {
    return String(this.usuario()?.rol || '').toUpperCase();
  }

  private readUser(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
