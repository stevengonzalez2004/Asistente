import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

type LoginModo = 'login' | 'registro' | 'recuperar' | 'codigo' | 'nueva';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly modo = signal<LoginModo>('login');
  readonly correoRecuperacion = signal('');
  readonly verPassword = signal(false);

  toggleVerPassword(): void {
    this.verPassword.update((val) => !val);
  }

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly recuperacionForm = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  readonly registroForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly codigoForm = this.fb.nonNullable.group({
    codigoIngresado: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  readonly nuevaPasswordForm = this.fb.nonNullable.group({
    nuevaContrasena: ['', [Validators.required, Validators.minLength(6)]],
    confirmarContrasena: ['', [Validators.required, Validators.minLength(6)]],
  });

  ingresar(): void {
    this.error.set('');
    this.mensaje.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    const { correo, password } = this.form.getRawValue();

    this.auth.login(correo, password).subscribe({
      next: (response) => {
        this.cargando.set(false);

        const rol = String(response.usuario.rol || '').toUpperCase();
        if (['ADMIN', 'ADMINISTRADOR'].includes(rol)) {
          this.router.navigateByUrl('/admin');
        } else if (['USER', 'USUARIO'].includes(rol)) {
          this.router.navigateByUrl('/usuario');
        } else {
          this.auth.logout();
          this.error.set('Tu usuario no tiene un rol habilitado para ingresar.');
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo iniciar sesion.');
      },
    });
  }

  mostrarRecuperacion(): void {
    this.error.set('');
    this.mensaje.set('');
    this.modo.set('recuperar');
    this.recuperacionForm.patchValue({ correo: this.form.controls.correo.value });
  }

  mostrarRegistro(): void {
    this.error.set('');
    this.mensaje.set('');
    this.modo.set('registro');
    this.registroForm.patchValue({ correo: this.form.controls.correo.value });
  }

  mostrarLogin(): void {
    this.error.set('');
    this.mensaje.set('');
    this.modo.set('login');
  }

  registrar(): void {
    this.error.set('');
    this.mensaje.set('');

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    const { nombre, correo, password, confirmarPassword } = this.registroForm.getRawValue();

    if (password !== confirmarPassword) {
      this.error.set('Las contrasenas no coinciden.');
      return;
    }

    this.cargando.set(true);

    this.auth.registrar(nombre.trim(), correo.trim(), password).subscribe({
      next: (response) => {
        this.cargando.set(false);
        this.mensaje.set(response.message || 'Registro exitoso. Ya puedes iniciar sesion.');
        this.form.patchValue({ correo, password: '' });
        this.registroForm.reset();
        this.modo.set('login');
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo registrar el usuario.');
      },
    });
  }

  solicitarCodigo(): void {
    this.error.set('');
    this.mensaje.set('');

    if (this.recuperacionForm.invalid) {
      this.recuperacionForm.markAllAsTouched();
      return;
    }

    const { correo } = this.recuperacionForm.getRawValue();
    this.cargando.set(true);

    this.auth.solicitarRecuperacion(correo).subscribe({
      next: (response) => {
        this.cargando.set(false);
        this.correoRecuperacion.set(correo);
        this.mensaje.set(response.message || 'Codigo enviado al correo.');
        this.modo.set('codigo');
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo enviar el codigo.');
      },
    });
  }

  verificarCodigo(): void {
    this.error.set('');
    this.mensaje.set('');

    if (this.codigoForm.invalid) {
      this.codigoForm.markAllAsTouched();
      return;
    }

    const correo = this.correoRecuperacion();
    const { codigoIngresado } = this.codigoForm.getRawValue();
    this.cargando.set(true);

    this.auth.verificarCodigo(correo, codigoIngresado).subscribe({
      next: (response) => {
        this.cargando.set(false);
        this.mensaje.set(response.message || 'Codigo verificado.');
        this.modo.set('nueva');
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo verificar el codigo.');
      },
    });
  }

  cambiarPassword(): void {
    this.error.set('');
    this.mensaje.set('');

    if (this.nuevaPasswordForm.invalid) {
      this.nuevaPasswordForm.markAllAsTouched();
      return;
    }

    const correo = this.correoRecuperacion();
    const { nuevaContrasena, confirmarContrasena } = this.nuevaPasswordForm.getRawValue();

    if (nuevaContrasena !== confirmarContrasena) {
      this.error.set('Las contrasenas no coinciden.');
      return;
    }

    this.cargando.set(true);
    this.auth.cambiarPassword(correo, nuevaContrasena).subscribe({
      next: (response) => {
        this.cargando.set(false);
        this.mensaje.set(response.message || 'Contrasena actualizada.');
        this.form.patchValue({ correo, password: '' });
        this.codigoForm.reset();
        this.nuevaPasswordForm.reset();
        this.modo.set('login');
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo cambiar la contrasena.');
      },
    });
  }
}
