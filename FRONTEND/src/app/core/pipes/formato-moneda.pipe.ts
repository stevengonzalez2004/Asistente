import { Pipe, PipeTransform } from '@angular/core';

/**
 * @pipe FormatoMonedaPipe
 * @description Formatea valores numéricos como montos de moneda unificados ($1,250.00 USD).
 */
@Pipe({
  name: 'formatoMoneda',
  standalone: true,
})
export class FormatoMonedaPipe implements PipeTransform {
  transform(valor: number | string | null | undefined, incluirCodigo: boolean = false): string {
    if (valor === null || valor === undefined || valor === '') {
      return '$0.00';
    }

    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(numero)) {
      return '$0.00';
    }

    const formateado = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);

    return incluirCodigo ? `${formateado} USD` : formateado;
  }
}
