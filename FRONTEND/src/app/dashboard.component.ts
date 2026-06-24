import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Cuenta, Movimiento, Usuario } from './models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  user: Usuario | null = null;
  accounts: Cuenta[] = [];
  movements: Movimiento[] = [];
  summary = { ingresos: 0, gastos: 0, balance: 0, totalMovimientos: 0 };
  form: FormGroup;
  accountForm: FormGroup;
  loading = false;
  submitting = false;
  feedback: { type: 'success' | 'error' | 'info'; message: string } | null = null;

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      descripcion: ['', Validators.required],
      monto: [0, [Validators.required, Validators.min(0.01)]],
      tipo: ['INGRESO', Validators.required],
      categoria: ['Otros', Validators.required],
      cuenta: ['', Validators.required],
      fecha: [new Date().toISOString().slice(0, 10)]
    });

    this.accountForm = this.fb.group({
      nombre: ['', Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {
    this.user = this.auth.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    await this.refresh();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  async addAccount(): Promise<void> {
    if (this.accountForm.invalid || !this.user || this.loading) {
      return;
    }

    this.loading = true;
    this.feedback = null;

    try {
      const token = this.auth.getToken();
      const response = await fetch('http://localhost:3000/api/movimientos/cuentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: this.accountForm.value.nombre.trim() })
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        this.feedback = { type: 'success', message: result.message || 'Cuenta creada correctamente.' };
        this.accountForm.reset();
        await this.refresh();
      } else {
        this.feedback = { type: 'error', message: result.message || 'No se pudo crear la cuenta.' };
      }
    } catch {
      this.feedback = { type: 'error', message: 'No se pudo conectar con el servidor.' };
    } finally {
      this.loading = false;
    }
  }

  async addMovement(): Promise<void> {
    if (this.form.invalid || !this.user || this.loading || this.submitting) {
      return;
    }

    this.loading = true;
    this.submitting = true;
    this.form.disable();
    this.feedback = null;

    try {
      const value = this.form.value;
      const token = this.auth.getToken();

      const response = await fetch('http://localhost:3000/api/movimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: this.user.username,
          nombre: this.user.nombre,
          tipo: value.tipo,
          categoria: value.categoria,
          monto: Number(value.monto),
          cuenta_origen: value.cuenta,
          cuenta_destino: value.cuenta,
          descripcion: value.descripcion,
          metodo_pago: 'EFECTIVO'
        })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        this.feedback = { type: 'success', message: result.message || 'Movimiento guardado correctamente.' };
        this.form.reset({
          descripcion: '',
          monto: 0,
          tipo: 'INGRESO',
          categoria: 'Otros',
          cuenta: this.accounts[0]?.nombre ?? '',
          fecha: new Date().toISOString().slice(0, 10)
        });
        await this.refresh();
      } else {
        this.feedback = { type: 'error', message: result.message || 'No se pudo guardar el movimiento.' };
      }
    } catch (error) {
      this.feedback = { type: 'error', message: 'No se pudo conectar con el servidor.' };
    } finally {
      this.loading = false;
      this.submitting = false;
      this.form.enable();
    }
  }

  async refresh(): Promise<void> {
    if (!this.user) {
      return;
    }

    const token = this.auth.getToken();
    const [cuentasResponse, reportesResponse] = await Promise.all([
      fetch('http://localhost:3000/api/movimientos/cuentas?telegram_id=' + this.user.id, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/reportes/web/hoy', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    if (cuentasResponse.ok) {
      const cuentasResult = await cuentasResponse.json();
      this.accounts = cuentasResult.data?.cuentas ?? [];
      this.summary.balance = cuentasResult.data?.balanceTotal ?? 0;
    }

    if (reportesResponse.ok) {
      const reportesResult = await reportesResponse.json();
      this.movements = (reportesResult.movimientos ?? []).map((item: any) => ({
        id: item.id,
        descripcion: item.descripcion,
        monto: Number(item.monto),
        tipo: item.tipo,
        categoria: item.categoria ?? 'Otros',
        cuenta: item.cuenta_origen ?? item.cuenta_destino ?? 'Sin cuenta',
        fecha: item.fecha
      }));
      this.summary.ingresos = this.movements.filter((m) => m.tipo === 'INGRESO').reduce((sum, item) => sum + item.monto, 0);
      this.summary.gastos = this.movements.filter((m) => m.tipo === 'GASTO').reduce((sum, item) => sum + item.monto, 0);
      this.summary.totalMovimientos = this.movements.length;
    }

    if (this.accounts.length && !this.form.value.cuenta) {
      this.form.patchValue({ cuenta: this.accounts[0].nombre });
    }
  }
}
