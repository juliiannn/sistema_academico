import { Component } from '@angular/core';
import { ClassSheet } from '../../../../shared/components/class-sheet/class-sheet';

// Planilla del curso: curso → materia → fecha. Directivos consultan; el docente registra.
@Component({
  selector: 'app-asistencia-page',
  imports: [ClassSheet],
  templateUrl: './asistencia-page.html'
})
export class AsistenciaPage {}
