import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Cuenta, Movimiento } from '../../core/models';
import { SnackbarService } from '../../core/snackbar.service';
import { Notice } from '../../shared/notice/notice';

type UserSection = 'cuentas' | 'movimientos' | 'crear-cuenta' | 'nuevo-movimiento';
type TipoMovimiento = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';

@Component({
  selector: 'app-user-dashboard',
  imports: [CommonModule, ReactiveFormsModule, DatePipe, DecimalPipe, Notice],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDashboard implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackbar = inject(SnackbarService);

  readonly usuario = this.auth.usuario;
  readonly cuentas = signal<Cuenta[]>([]);
  readonly movimientos = signal<Movimiento[]>([]);
  readonly balanceTotal = signal(0);
  readonly seccionActiva = signal<UserSection>('cuentas');
  readonly cargando = signal(false);
  readonly guardandoCuenta = signal(false);
  readonly guardandoMovimiento = signal(false);
  readonly error = signal('');

  readonly totalCuentas = computed(() => this.cuentas().length);
  readonly totalMovimientos = computed(() => this.movimientos().length);
  readonly ultimosMovimientos = computed(() => this.movimientos().slice(0, 6));

  readonly cuentaForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly movimientoForm = this.fb.nonNullable.group({
    tipo: ['GASTO' as TipoMovimiento, Validators.required],
    categoria: ['Otros'],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    cuenta_origen: ['', Validators.required],
    cuenta_destino: [''],
    descripcion: [''],
    metodo_pago: ['EFECTIVO'],
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');
    this.cargarCuentas();
    this.cargarMovimientos();
  }

  cargarCuentas(): void {
    this.api.obtenerMisCuentas().subscribe({
      next: (balance) => {
        this.cuentas.set(balance.cuentas || []);
        this.balanceTotal.set(Number(balance.balance_total || 0));
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cargar tus cuentas.');
      },
    });
  }

  cargarMovimientos(): void {
    this.api.listarMisMovimientos().subscribe({
      next: (movimientos) => this.movimientos.set(movimientos || []),
      error: (err) => this.error.set(err?.error?.message || 'No se pudo cargar tu historial.'),
    });
  }

  cambiarSeccion(seccion: UserSection): void {
    this.seccionActiva.set(seccion);
    this.limpiarAvisos();
  }

  crearCuenta(): void {
    if (this.cuentaForm.invalid) {
      this.cuentaForm.markAllAsTouched();
      return;
    }

    this.guardandoCuenta.set(true);
    this.error.set('');

    const { nombre } = this.cuentaForm.getRawValue();
    this.api.crearCuenta(nombre.trim()).subscribe({
      next: () => {
        this.guardandoCuenta.set(false);
        this.snackbar.exito('Cuenta creada correctamente.');
        this.cuentaForm.reset({ nombre: '' });
        this.cargarCuentas();
        this.seccionActiva.set('cuentas');
      },
      error: (err) => {
        this.guardandoCuenta.set(false);
        this.snackbar.error(err?.error?.message || 'No se pudo crear la cuenta.');
      },
    });
  }

  registrarMovimiento(): void {
    const tipo = this.movimientoForm.controls.tipo.value;
    const requiereDestino = tipo === 'TRANSFERENCIA';

    if (requiereDestino && !this.movimientoForm.controls.cuenta_destino.value) {
      this.movimientoForm.controls.cuenta_destino.setErrors({ required: true });
    }

    if (this.movimientoForm.invalid) {
      this.movimientoForm.markAllAsTouched();
      return;
    }

    const payload = this.movimientoForm.getRawValue();

    if (requiereDestino && payload.cuenta_origen === payload.cuenta_destino) {
      this.error.set('La cuenta destino debe ser diferente a la cuenta origen.');
      return;
    }

    this.guardandoMovimiento.set(true);
    this.error.set('');

    this.api
      .registrarMovimiento({
        tipo: payload.tipo,
        categoria: payload.categoria || 'Otros',
        monto: Number(payload.monto),
        cuenta_origen: payload.cuenta_origen,
        cuenta_destino: payload.cuenta_destino || null,
        descripcion: payload.descripcion || null,
        metodo_pago: payload.metodo_pago || null,
      })
      .subscribe({
        next: () => {
          this.guardandoMovimiento.set(false);
          this.snackbar.exito('Movimiento registrado correctamente.');
          this.movimientoForm.reset({
            tipo: 'GASTO',
            categoria: 'Otros',
            monto: 0,
            cuenta_origen: '',
            cuenta_destino: '',
            descripcion: '',
            metodo_pago: 'EFECTIVO',
          });
          this.cargarCuentas();
          this.cargarMovimientos();
          this.seccionActiva.set('movimientos');
        },
        error: (err) => {
          this.guardandoMovimiento.set(false);
          this.snackbar.error(err?.error?.message || 'No se pudo registrar el movimiento.');
        },
      });
  }

  cerrarSesion(): void {
    this.auth.logout();
  }

  limpiarAvisos(): void {
    this.error.set('');
  }

  tipoMovimiento(movimiento: Movimiento): string {
    return movimiento.tipo || movimiento.tipo_movimiento || 'MOVIMIENTO';
  }

  saldoCuenta(cuenta: Cuenta): number {
    return Number(cuenta.saldo_actual || 0);
  }
}
