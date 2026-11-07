import { Component, input } from '@angular/core';

// Título + descripción a la izquierda y acciones (botones) a la derecha
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.css'
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
