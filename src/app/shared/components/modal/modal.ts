import { Component, input, output } from '@angular/core';

// Ventana modal genérica: título, botón cerrar y contenido proyectado
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css'
})
export class Modal {
  readonly title = input.required<string>();
  readonly closed = output<void>();
}
