import { Component, input } from '@angular/core';

// Contenedor con borde y sombra, con título opcional
@Component({
  selector: 'app-card',
  templateUrl: './card.html',
  styleUrl: './card.css'
})
export class Card {
  readonly title = input('');
  readonly subtitle = input('');
}
