import { Component, input } from '@angular/core';

// Mensaje en línea (error / éxito / informativo)
@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.css'
})
export class Alert {
  readonly type = input<'error' | 'success' | 'info'>('info');
}
