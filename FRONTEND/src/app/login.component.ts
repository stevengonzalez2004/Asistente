import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  form: FormGroup;
  registerMode = false;
  errorMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      nombre: [''],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  toggleMode(): void {
    this.registerMode = !this.registerMode;
    this.errorMessage = '';
    this.form.reset();
    this.form.patchValue({ nombre: '' });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.errorMessage = 'Completa todos los campos correctamente.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const { nombre, correo, password } = this.form.value;

    if (this.registerMode) {
      const result = await this.auth.register(nombre, correo, password);
      this.loading = false;
      if (!result.success) {
        this.errorMessage = result.message || 'No se pudo crear la cuenta.';
        return;
      }

      this.errorMessage = 'Cuenta creada. Ahora puedes iniciar sesión.';
      this.registerMode = false;
      this.form.reset();
      this.form.patchValue({ nombre: '' });
      return;
    }

    const result = await this.auth.login(correo, password);
    this.loading = false;
    if (!result.user) {
      this.errorMessage = result.message || 'Credenciales inválidas.';
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}
