import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

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

  protected isLoginPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/';
  }

  protected logout(): void {
    this.authService.logout();
  }
}
