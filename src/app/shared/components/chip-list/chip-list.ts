import { Component, input, output } from '@angular/core';
import { Option } from '../../../core/models/crud.model';

// Lista de "chips" clicables (filtros rápidos, preguntas de ejemplo)
@Component({
  selector: 'app-chip-list',
  templateUrl: './chip-list.html',
  styleUrl: './chip-list.css'
})
export class ChipList {
  readonly options = input<Option[]>([]);
  readonly selected = input('');
  readonly picked = output<string>();
}
