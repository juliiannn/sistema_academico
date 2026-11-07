import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth';
import { PermissionsService } from '../../../core/services/permissions';
import { ReferenceService } from '../../../core/services/references';
import { Support } from '../../../core/models/aux-api.model';
import { Option } from '../../../core/models/crud.model';

// Permisos de los apoyos visuales: salen de la tabla role_modules (módulo /piar/supports)
@Injectable({ providedIn: 'root' })
export class ApoyosService {

  private auth = inject(AuthService);
  private permissions = inject(PermissionsService);
  private refs = inject(ReferenceService);

  canCreate(): boolean {
    return this.permissions.can('/piar/supports', 'crear');
  }

  // Con alcance ALL se modifica cualquiera; con alcance ASSIGNED (docente) solo los que creó el propio usuario
  canModify(support: Support): boolean {
    if (!this.permissions.can('/piar/supports', 'editar')) {
      return false;
    }
    if (this.permissions.find('/piar/supports')?.alcance === 'ALL') {
      return true;
    }
    return support.creado_por.toLowerCase() === this.auth.email().toLowerCase();
  }

  // Estudiantes (se ven nombres; el valor es el correo, que es como la API auxiliar los relaciona)
  studentOptions(): Promise<Option[]> {
    return this.refs.options('studentEmails');
  }

  /** correo → nombre de estudiantes, docentes, coordinadores y rectores (lo que el rol actual pueda consultar). */
  async directory(): Promise<Map<string, string>> {
    const lists = await Promise.all(['/students', '/teachers', '/coordinators', '/rectors'].map(e => this.refs.raw(e)));
    const names = new Map<string, string>();
    lists.flat().forEach(p => names.set(String(p['email']).toLowerCase(), String(p['fullName'])));
    return names;
  }

  nameOfEmail(email: string | null | undefined, names: Map<string, string>): string {
    if (!email) {
      return 'Todo el aula';
    }
    return names.get(email.toLowerCase()) ?? email;
  }
}
