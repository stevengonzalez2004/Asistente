import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MovimientoGlobal } from '../../../../core/models';

export interface MovimientoDetailDialogData {
  movimiento: MovimientoGlobal;
}

@Component({
  selector: 'app-movimiento-detail-dialog',
  imports: [CommonModule, DatePipe, DecimalPipe, MatButtonModule, MatChipsModule, MatDialogModule],
  templateUrl: './movimiento-detail-dialog.html',
  styleUrl: './movimiento-detail-dialog.css',
})
export class MovimientoDetailDialog {
  private readonly dialogRef = inject(MatDialogRef<MovimientoDetailDialog, void>);
  readonly data = inject<MovimientoDetailDialogData>(MAT_DIALOG_DATA);

  cerrar(): void {
    this.dialogRef.close();
  }
}
