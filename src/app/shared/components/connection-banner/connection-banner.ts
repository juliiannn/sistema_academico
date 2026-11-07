import { Component, input, output } from '@angular/core';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';

// Aviso cuando la API auxiliar no responde, con botón para reintentar
@Component({
  selector: 'app-connection-banner',
  imports: [Alert, Button],
  templateUrl: './connection-banner.html',
  styleUrl: './connection-banner.css'
})
export class ConnectionBanner {
  readonly online = input<boolean | null>(null);
  readonly retry = output<void>();
}
