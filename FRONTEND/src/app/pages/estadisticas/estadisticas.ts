import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../core/api.service';
import { CategoriaUsada, DashboardAdminData, MovimientoGlobal, ReporteData, UsuarioTop } from '../../core/models';
import { ChartCard } from '../../shared/chart-card/chart-card';
import {
  buildBalanceMensualOptions,
  buildCalendarioFinancieroOptions,
  buildCategoriasPieOptions,
  buildCategoriasRadarOptions,
  buildIngresosVsGastosOptions,
  buildTendenciaLineOptions,
  buildUsuariosDonutOptions,
} from '../../shared/chart-card/chart-builders';
import { PanelCard } from '../../shared/panel-card/panel-card';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { StatCard } from '../../shared/stat-card/stat-card';

@Component({
  selector: 'app-estadisticas',
  imports: [CommonModule, MatIconModule, MatListModule, ChartCard, PanelCard, Skeleton, StatCard],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class Estadisticas implements OnInit {
  private readonly api = inject(ApiService);

  readonly cargando = signal(true);
  readonly error = signal('');
  readonly dashboardData = signal<DashboardAdminData | null>(null);
  readonly movimientosDetalle = signal<ReporteData | null>(null);

  readonly movimientosCrudos = computed(() => (this.movimientosDetalle()?.datos ?? []) as MovimientoGlobal[]);
  readonly categoriasMasUtilizadas = computed<CategoriaUsada[]>(() => this.dashboardData()?.charts.categoriasMasUsadas ?? []);
  readonly usuariosMasActivos = computed<UsuarioTop[]>(() => this.dashboardData()?.charts.topUsuarios ?? []);

  readonly mayorGasto = computed(() => this.mayorPorTipo('GASTO'));
  readonly mayorIngreso = computed(() => this.mayorPorTipo('INGRESO'));

  readonly promedioDiario = computed(() => {
    const filas = this.movimientosCrudos();
    if (filas.length === 0) return 0;
    const total = filas.reduce((suma, m) => suma + Number(m.monto), 0);
    const dias = new Set(filas.map((m) => String(m.fecha).slice(0, 10)));
    return dias.size > 0 ? total / dias.size : 0;
  });

  readonly promedioMensual = computed(() => {
    const meses = this.dashboardData()?.charts.tendenciaMensual ?? [];
    if (meses.length === 0) return 0;
    const total = meses.reduce((suma, m) => suma + Number(m.ingresos) + Number(m.gastos), 0);
    return total / meses.length;
  });

  readonly mayorGastoValor = computed(() => this.formatearMonedaOpcional(this.mayorGasto()?.monto));
  readonly mayorIngresoValor = computed(() => this.formatearMonedaOpcional(this.mayorIngreso()?.monto));
  readonly promedioDiarioValor = computed(() => this.formatearMoneda(this.promedioDiario()));
  readonly promedioMensualValor = computed(() => this.formatearMoneda(this.promedioMensual()));

  readonly pieOptions = computed(() => buildCategoriasPieOptions(this.categoriasMasUtilizadas()));
  readonly barOptions = computed(() => buildIngresosVsGastosOptions(this.dashboardData()?.charts.tendenciaMensual ?? []));
  readonly lineOptions = computed(() => buildTendenciaLineOptions(this.dashboardData()?.charts.tendenciaMensual ?? []));
  readonly radarOptions = computed(() => buildCategoriasRadarOptions(this.categoriasMasUtilizadas()));
  readonly donutUsuariosOptions = computed(() => buildUsuariosDonutOptions(this.usuariosMasActivos()));
  readonly areaOptions = computed(() => buildBalanceMensualOptions(this.dashboardData()?.charts.tendenciaMensual ?? []));
  readonly calendarioOptions = computed(() =>
    buildCalendarioFinancieroOptions((this.movimientosDetalle()?.chartDatos ?? []) as { dia: string; monto_total: number }[]),
  );

  ngOnInit(): void {
    this.cargarDashboard();
    this.cargarMovimientos();
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.error.set('');

    this.api.obtenerDashboardAdmin().subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cargar las estadisticas.');
      },
    });
  }

  cargarMovimientos(): void {
    this.api.generarReporte('movimientos-fecha', {}).subscribe({
      next: (data) => this.movimientosDetalle.set(data),
      error: () => {},
    });
  }

  private mayorPorTipo(tipo: 'GASTO' | 'INGRESO'): MovimientoGlobal | null {
    const filas = this.movimientosCrudos().filter((m) => m.tipo === tipo);
    if (filas.length === 0) return null;
    return filas.reduce((mayor, actual) => (Number(actual.monto) > Number(mayor.monto) ? actual : mayor));
  }

  private formatearMoneda(valor: number): string {
    return `$${valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatearMonedaOpcional(valor: number | string | undefined): string {
    return valor !== undefined ? this.formatearMoneda(Number(valor)) : '—';
  }
}
