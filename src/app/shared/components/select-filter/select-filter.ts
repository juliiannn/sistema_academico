import { Component, input, output } from '@angular/core';
import { Option } from '../../../core/models/crud.model';

// Filtro por NOMBRE: lista de opciones legibles; emite el valor (id) seleccionado o '' para "todos"
@Component({
  selector: 'app-select-filter',
  templateUrl: './select-filter.html',
  styleUrl: './select-filter.css'
})
export class SelectFilter {
  readonly label = input.required<string>();
  readonly options = input<Option[]>([]);
  readonly allLabel = input('Todos');

  readonly changed = output<string>();
}
