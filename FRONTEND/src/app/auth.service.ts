import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Usuario } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserKey = 'asistente-financiero-current-user';
  private readonly tokenKey = 'asistente-financiero-token';
  private currentUserSubject = new BehaviorSubject<Usuario | null>(this.readCurrentUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {}

  async login(correo: string, password: string): Promise<{ user: Usuario | null; token: string | null; message?: string }> {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password })
    });

    const result = await response.json();
    if (!response.ok || !result.token) {
      return { user: null, token: null, message: result.message || 'No se pudo iniciar sesión.' };
    }

    const user = result.usuario as Usuario;
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    localStorage.setItem(this.tokenKey, result.token);
    this.currentUserSubject.next(user);
    return { user, token: result.token };
  }

  async register(nombre: string, correo: string, password: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, password })
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, message: result.message || 'No se pudo crear la cuenta.' };
    }

    return { success: true, message: result.message };
  }

  logout(): void {
    localStorage.removeItem(this.currentUserKey);
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private readCurrentUser(): Usuario | null {
    const raw = localStorage.getItem(this.currentUserKey);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  }
}
