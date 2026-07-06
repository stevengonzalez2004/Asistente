import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  imports: [CommonModule],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  @Input() variant: 'text' | 'card' | 'circle' | 'chart' = 'text';
  @Input() width = '100%';
  @Input() height = '16px';
}
