import { Component } from '@angular/core';
import { CrudManager } from '../../../../shared/components/crud-manager/crud-manager';
import { USUARIOS_CONFIG } from '../../models/usuarios.config';

@Component({
  selector: 'app-usuarios-page',
  imports: [CrudManager],
  templateUrl: './usuarios-page.html'
})
export class UsuariosPage {
  readonly config = USUARIOS_CONFIG;
}
