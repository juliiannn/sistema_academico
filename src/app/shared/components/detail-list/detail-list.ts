import { Component, input } from '@angular/core';

export interface DetailItem {
  label: string;
  value: string;
}

// Ficha de datos: una tarjeta por cada par etiqueta / valor
@Component({
  selector: 'app-detail-list',
  templateUrl: './detail-list.html',
  styleUrl: './detail-list.css'
})
export class DetailList {
  readonly items = input<DetailItem[]>([]);
}
