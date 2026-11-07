import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.css'
})
export class LoadingState {
  readonly message = input('Cargando...');
}
