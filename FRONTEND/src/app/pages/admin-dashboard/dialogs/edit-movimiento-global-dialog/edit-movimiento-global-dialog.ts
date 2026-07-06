import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MovimientoGlobal, MovimientoPayload } from '../../../../core/models';

export interface EditMovimientoGlobalDialogData {
  movimiento: MovimientoGlobal;
}

@Component({
  selector: 'app-edit-movimiento-global-dialog',
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './edit-movimiento-global-dialog.html',
  styleUrl: './edit-movimiento-global-dialog.css',
})
export class EditMovimientoGlobalDialog {
  private readonly dialogRef = inject(MatDialogRef<EditMovimientoGlobalDialog, MovimientoPayload>);
  private readonly fb = inject(FormBuilder);
  readonly data = inject<EditMovimientoGlobalDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    categoria: [this.data.movimiento.categoria || ''],
    monto: [Number(this.data.movimiento.monto || 0), [Validators.required, Validators.min(0.01)]],
    cuenta_origen: [this.data.movimiento.cuenta_origen || ''],
    cuenta_destino: [this.data.movimiento.cuenta_destino || ''],
    descripcion: [this.data.movimiento.descripcion || ''],
    metodo_pago: [this.data.movimiento.metodo_pago || ''],
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
