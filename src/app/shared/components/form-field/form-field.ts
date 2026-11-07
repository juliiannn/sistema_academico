import { Component, input } from '@angular/core';

// Etiqueta + control (proyectado) + mensaje de error. Presentacional: recibe el error ya calculado.
@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.css'
})
export class FormField {
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
}
