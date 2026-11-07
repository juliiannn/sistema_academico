import { Component, inject, input } from '@angular/core';
import { AuthService } from '../../core/services/auth';
import { enumLabel } from '../../core/models/enums';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class Topbar {

  auth = inject(AuthService);

  // Título de la página actual (viene de data.title de la ruta)
  readonly title = input('');

  roleLabel(): string {
    return enumLabel('role', this.auth.role());
  }
}
