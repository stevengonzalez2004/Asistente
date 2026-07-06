import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from './core/api.service';
import { AuthService } from './core/auth.service';
import { TemaSistema } from './core/models';
import { ADMIN_NAV_ITEMS, SidebarNavItem, USER_NAV_ITEMS } from './core/sidebar-nav';
import { ThemeService } from './core/theme.service';

const SIDEBAR_COLLAPSED_KEY = 'asistente_financiero_sidebar_collapsed';
const NOMBRE_SISTEMA_POR_DEFECTO = 'Asistente';
const NOMBRE_SISTEMA_SUB_POR_DEFECTO = 'Financiero';
const NAVBAR_BRAND_POR_DEFECTO = 'Control Financiero';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly adminNavItems: SidebarNavItem[] = ADMIN_NAV_ITEMS;
  protected readonly userNavItems: SidebarNavItem[] = USER_NAV_ITEMS;
  protected readonly sidebarCollapsed = signal<boolean>(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');

  protected readonly tema = signal<TemaSistema>('claro');
  protected readonly nombreSistema = signal(NOMBRE_SISTEMA_POR_DEFECTO);
  protected readonly nombreSistemaSub = signal(NOMBRE_SISTEMA_SUB_POR_DEFECTO);
  protected readonly navbarBrand = signal(NAVBAR_BRAND_POR_DEFECTO);
  protected readonly logoUrl = signal('');

  constructor(
    private readonly api: ApiService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly themeService: ThemeService,
  ) {
    const temaInicial = this.themeService.obtenerTema();
    this.tema.set(temaInicial);
    this.themeService.aplicarTema(temaInicial);
  }

  ngOnInit(): void {
    this.api.obtenerConfiguracion().subscribe((config) => this.aplicarMarca(config));
  }

  protected toggleTema(): void {
    const nuevoTema: TemaSistema = this.tema() === 'claro' ? 'oscuro' : 'claro';
    this.tema.set(nuevoTema);
    this.themeService.guardarTema(nuevoTema);
  }

  private aplicarMarca(config: { nombre_sistema?: string; logo_url?: string } | null): void {
    const nombre = config?.nombre_sistema?.trim();
    this.logoUrl.set(config?.logo_url?.trim() || '');

    if (!nombre) {
      this.nombreSistema.set(NOMBRE_SISTEMA_POR_DEFECTO);
      this.nombreSistemaSub.set(NOMBRE_SISTEMA_SUB_POR_DEFECTO);
      this.navbarBrand.set(NAVBAR_BRAND_POR_DEFECTO);
      return;
    }

    const partes = nombre.split(/\s+/);
    this.nombreSistema.set(partes[0]);
    this.nombreSistemaSub.set(partes.slice(1).join(' ') || '');
    this.navbarBrand.set(nombre);
  }

  protected get isLoggedIn(): boolean {
    return !!this.authService.usuario();
  }

  protected get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  protected get isUser(): boolean {
    return this.authService.isUser();
  }

  protected get userName(): string {
    return this.authService.usuario()?.nombre || this.authService.usuario()?.correo || '';
  }

  protected get roleLabel(): string {
    return this.isAdmin ? 'Administrador' : 'Usuario';
  }

  protected get avatarInitials(): string {
    const usuario = this.authService.usuario();
    const nombre = usuario?.nombre?.trim();
    if (nombre) {
      const partes = nombre.split(/\s+/).filter(Boolean);
      const primera = partes[0]?.[0] ?? '';
      const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
      return (primera + ultima).toUpperCase();
    }
    return (usuario?.correo?.[0] ?? '?').toUpperCase();
  }

  protected get estadoActivo(): boolean {
    return !this.authService.usuario()?.deleted_at;
  }

  protected get estadoLabel(): string {
    return this.estadoActivo ? 'Activo' : 'Deshabilitado';
  }

  protected isLoginPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/';
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((colapsado) => !colapsado);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(this.sidebarCollapsed()));
  }

  protected logout(): void {
    this.authService.logout();
  }
}
