import { Component, input } from '@angular/core';

// Tarjeta de indicador (KPI): etiqueta + número grande
@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.css'
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
}
