import { Component, input } from '@angular/core';

// Marca "SA" + texto opcional. Se usa en sidebar, login, cambio de contraseña, header y footer.
@Component({
  selector: 'app-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.css'
})
export class Logo {
  readonly text = input('');
  readonly textClass = input('');
}
