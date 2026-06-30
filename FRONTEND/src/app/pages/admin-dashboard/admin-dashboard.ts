import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { BalanceUsuario, Cuenta, Movimiento, Usuario } from '../../core/models';

type AdminSection = 'balances' | 'movimientos' | 'usuario';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly usuarios = signal<Usuario[]>([]);
  readonly movimientos = signal<Movimiento[]>([]);
  readonly balancesPorUsuario = signal<Record<number, BalanceUsuario>>({});
  readonly usuarioSeleccionado = signal<Usuario | null>(null);
  readonly movimientoEditando = signal<Movimiento | null>(null);
  readonly seccionActiva = signal<AdminSection>('balances');
  readonly cargandoUsuarios = signal(false);
  readonly cargandoMovimientos = signal(false);
  readonly cargandoBalances = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly buscandoUsuarios = signal(false);

  readonly totalMovimientos = computed(() => this.movimientos().length);
  readonly balanceSeleccionado = computed(() => {
    const usuario = this.usuarioSeleccionado();
    return usuario ? this.balancesPorUsuario()[usuario.id] : null;
  });
  readonly cuentasSeleccionadas = computed(() => this.balanceSeleccionado()?.cuentas || []);
  readonly balanceTotalSeleccionado = computed(() => Number(this.balanceSeleccionado()?.balance_total || 0));
  readonly balanceGlobalVisible = computed(() =>
    this.usuarios().reduce((total, usuario) => total + Number(this.balancesPorUsuario()[usuario.id]?.balance_total || 0), 0),
  );

  readonly usuarioForm = this.fb.nonNullable.group({
    nombre: [''],
    correo: ['', [Validators.required, Validators.email]],
    password: [''],
  });

  readonly busquedaForm = this.fb.nonNullable.group({
    correo: [''],
  });

  readonly movimientoForm = this.fb.nonNullable.group({
    categoria: [''],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    cuenta_origen: [''],
    cuenta_destino: [''],
    descripcion: [''],
    metodo_pago: [''],
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cerrarSesion(): void {
    this.auth.logout();
  }

  cargarUsuarios(): void {
    this.cargandoUsuarios.set(true);
    this.error.set('');

    this.api.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargandoUsuarios.set(false);
        this.cargarBalancesUsuarios(usuarios);

        if (!this.usuarioSeleccionado() && usuarios.length > 0) {
          this.seleccionarUsuario(usuarios[0]);
        }
      },
      error: (err) => {
        this.cargandoUsuarios.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cargar los usuarios.');
      },
    });
  }

  buscarUsuarios(): void {
    const correo = this.busquedaForm.controls.correo.value.trim();
    if (!correo) {
      this.cargarUsuarios();
      return;
    }

    this.buscandoUsuarios.set(true);
    this.cargandoUsuarios.set(true);
    this.error.set('');

    this.api.buscarUsuariosPorCorreo(correo).subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargarBalancesUsuarios(usuarios);
        this.cargandoUsuarios.set(false);
        this.buscandoUsuarios.set(false);

        if (usuarios.length > 0) {
          this.seleccionarUsuario(usuarios[0]);
        } else {
          this.usuarioSeleccionado.set(null);
          this.movimientos.set([]);
        }
      },
      error: (err) => {
        this.cargandoUsuarios.set(false);
        this.buscandoUsuarios.set(false);
        this.error.set(err?.error?.message || 'No se pudo buscar usuarios.');
      },
    });
  }

  limpiarBusqueda(): void {
    this.busquedaForm.reset({ correo: '' });
    this.usuarioSeleccionado.set(null);
    this.movimientos.set([]);
    this.cargarUsuarios();
  }

  seleccionarUsuario(usuario: Usuario): void {
    this.usuarioSeleccionado.set(usuario);
    this.movimientoEditando.set(null);
    this.usuarioForm.reset({
      nombre: usuario.nombre || '',
      correo: usuario.correo,
      password: '',
    });
    this.cargarBalanceUsuario(usuario.id);
    this.cargarMovimientos(usuario.id);
  }

  cambiarSeccion(seccion: AdminSection): void {
    this.seccionActiva.set(seccion);
  }

  guardarUsuario(): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario || this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    const payload = this.usuarioForm.getRawValue();
    const body = {
      nombre: payload.nombre,
      correo: payload.correo,
      ...(payload.password ? { password: payload.password } : {}),
    };

    this.api.actualizarUsuario(usuario.id, body).subscribe({
      next: (actualizado) => {
        this.mensaje.set('Usuario actualizado.');
        this.usuarioSeleccionado.set(actualizado);
        this.usuarios.update((usuarios) => usuarios.map((item) => (item.id === actualizado.id ? actualizado : item)));
        this.usuarioForm.patchValue({ password: '' });
      },
      error: (err) => this.error.set(err?.error?.message || 'No se pudo actualizar el usuario.'),
    });
  }

  deshabilitarUsuario(usuario: Usuario): void {
    if (this.usuarioDeshabilitado(usuario)) return;
    if (!confirm(`Deshabilitar a ${usuario.correo}?`)) return;

    this.api.deshabilitarUsuario(usuario.id).subscribe({
      next: () => {
        this.mensaje.set('Usuario deshabilitado.');
        this.usuarios.update((usuarios) => usuarios.filter((item) => item.id !== usuario.id));
        if (this.usuarioSeleccionado()?.id === usuario.id) {
          this.usuarioSeleccionado.set(null);
          this.movimientos.set([]);
        }
      },
      error: (err) => this.error.set(err?.error?.message || 'No se pudo deshabilitar el usuario.'),
    });
  }

  cargarMovimientos(usuarioId: number): void {
    this.cargandoMovimientos.set(true);
    this.api.listarMovimientosUsuario(usuarioId).subscribe({
      next: (movimientos) => {
        this.movimientos.set(movimientos);
        this.cargandoMovimientos.set(false);
      },
      error: (err) => {
        this.cargandoMovimientos.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cargar los movimientos.');
      },
    });
  }

  cargarBalancesUsuarios(usuarios: Usuario[]): void {
    if (usuarios.length === 0) {
      this.balancesPorUsuario.set({});
      return;
    }

    this.cargandoBalances.set(true);
    let pendientes = usuarios.length;
    const terminarCarga = () => {
      pendientes -= 1;
      if (pendientes === 0) {
        this.cargandoBalances.set(false);
      }
    };

    usuarios.forEach((usuario) => {
      this.api.obtenerCuentasUsuario(usuario.id).subscribe({
        next: (balance) => {
          this.balancesPorUsuario.update((balances) => ({
            ...balances,
            [usuario.id]: balance,
          }));
        },
        error: () => {
          this.balancesPorUsuario.update((balances) => ({
            ...balances,
            [usuario.id]: { balance_total: 0, cuentas: [] },
          }));
          terminarCarga();
        },
        complete: terminarCarga,
      });
    });
  }

  cargarBalanceUsuario(usuarioId: number): void {
    this.api.obtenerCuentasUsuario(usuarioId).subscribe({
      next: (balance) => {
        this.balancesPorUsuario.update((balances) => ({
          ...balances,
          [usuarioId]: balance,
        }));
      },
      error: (err) => this.error.set(err?.error?.message || 'No se pudieron cargar las cuentas del usuario.'),
    });
  }

  editarMovimiento(movimiento: Movimiento): void {
    this.movimientoEditando.set(movimiento);
    this.movimientoForm.reset({
      categoria: movimiento.categoria || '',
      monto: Number(movimiento.monto || 0),
      cuenta_origen: movimiento.cuenta_origen || '',
      cuenta_destino: movimiento.cuenta_destino || '',
      descripcion: movimiento.descripcion || '',
      metodo_pago: movimiento.metodo_pago || '',
    });
  }

  guardarMovimiento(): void {
    const usuario = this.usuarioSeleccionado();
    const movimiento = this.movimientoEditando();

    if (!usuario || !movimiento || this.movimientoForm.invalid) {
      this.movimientoForm.markAllAsTouched();
      return;
    }

    this.api.actualizarMovimiento(usuario.id, movimiento.id, this.movimientoForm.getRawValue()).subscribe({
      next: () => {
        this.mensaje.set('Movimiento actualizado.');
        this.movimientoEditando.set(null);
        this.cargarMovimientos(usuario.id);
        this.cargarBalanceUsuario(usuario.id);
      },
      error: (err) => this.error.set(err?.error?.message || 'No se pudo actualizar el movimiento.'),
    });
  }

  eliminarMovimiento(movimiento: Movimiento): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario || !confirm(`Eliminar el movimiento #${movimiento.id}?`)) return;

    this.api.eliminarMovimiento(usuario.id, movimiento.id).subscribe({
      next: () => {
        this.mensaje.set('Movimiento eliminado.');
        this.movimientos.update((movimientos) => movimientos.filter((item) => item.id !== movimiento.id));
        this.cargarBalanceUsuario(usuario.id);
      },
      error: (err) => this.error.set(err?.error?.message || 'No se pudo eliminar el movimiento.'),
    });
  }

  limpiarAvisos(): void {
    this.mensaje.set('');
    this.error.set('');
  }

  tipoMovimiento(movimiento: Movimiento): string {
    return movimiento.tipo || movimiento.tipo_movimiento || 'MOVIMIENTO';
  }

  balanceUsuario(usuario: Usuario): BalanceUsuario | null {
    return this.balancesPorUsuario()[usuario.id] || null;
  }

  saldoCuenta(cuenta: Cuenta): number {
    return Number(cuenta.saldo_actual || 0);
  }

  usuarioDeshabilitado(usuario: Usuario): boolean {
    return Boolean(usuario.deleted_at);
  }
}
