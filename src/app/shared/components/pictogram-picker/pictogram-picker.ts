import { Component, input, output, signal } from '@angular/core';
import { Pictogram } from '../../../core/models/aux-api.model';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { Attribution } from '../attribution/attribution';
import { LoadingState } from '../loading-state/loading-state';

// Buscador de pictogramas ARASAAC. Presentacional: emite la búsqueda y el pictograma elegido.
@Component({
  selector: 'app-pictogram-picker',
  imports: [Button, Alert, LoadingState, Attribution],
  templateUrl: './pictogram-picker.html',
  styleUrl: './pictogram-picker.css'
})
export class PictogramPicker {
  readonly results = input<Pictogram[]>([]);
  readonly loading = input(false);
  readonly error = input('');
  readonly searched = input(false);

  readonly search = output<string>();
  readonly pick = output<Pictogram>();

  readonly term = signal('');

  onInput(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
  }

  submit(event: Event): void {
    event.preventDefault();
    const q = this.term().trim();
    if (q.length >= 2) {
      this.search.emit(q);
    }
  }
}
