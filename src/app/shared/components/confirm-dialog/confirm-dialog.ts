import { Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';
import { Button } from '../button/button';

// Pregunta de confirmación (reemplaza a window.confirm). Reutiliza Modal y Button.
@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal, Button],
  templateUrl: './confirm-dialog.html'
})
export class ConfirmDialog {
  readonly title = input('Confirmar');
  readonly message = input.required<string>();
  readonly confirmText = input('Confirmar');
  readonly variant = input<'primary' | 'danger' | 'warning'>('primary');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
