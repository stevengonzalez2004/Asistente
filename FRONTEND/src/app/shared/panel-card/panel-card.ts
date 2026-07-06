import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-panel-card',
  imports: [CommonModule, MatIconModule],
  templateUrl: './panel-card.html',
  styleUrl: './panel-card.css',
})
export class PanelCard {
  @Input({ required: true }) titulo!: string;
  @Input() icon?: string;
  @Input() loading = false;
}
