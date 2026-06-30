import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponse, Usuario } from './models';

const API_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'asistente_financiero_token';
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
        localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
        this.usuario.set(response.usuario);
      }),
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

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
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
