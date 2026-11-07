import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { PermissionsService } from '../../core/services/permissions';
import { Logo } from '../../shared/components/logo/logo';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Logo],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {

  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);

  // El menú sale de la base de datos: módulos con puede_ver = TRUE en role_modules para el rol del usuario
  readonly groups = this.permissions.navGroups;

  constructor() {
    void this.permissions.load().catch(() => undefined);
  }

  logout(event: Event): void {
    event.preventDefault();
    this.permissions.clear();
    this.auth.logout();
  }
}
