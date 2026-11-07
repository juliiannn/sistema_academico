import { Component, input, output } from '@angular/core';

// Botón reutilizable con variantes (primary, secondary, danger, success, warning)
@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.css'
})
export class Button {
  readonly variant = input<'primary' | 'secondary' | 'danger' | 'success' | 'warning'>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly block = input(false);
  readonly small = input(false);
  readonly disabled = input(false);

  readonly clicked = output<MouseEvent>();
}
