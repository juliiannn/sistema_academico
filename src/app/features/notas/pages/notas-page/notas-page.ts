import { Component } from '@angular/core';
import { ClassSheet } from '../../../../shared/components/class-sheet/class-sheet';

// Planilla del curso: curso → materia → periodo. Directivos consultan; el docente registra.
@Component({
  selector: 'app-notas-page',
  imports: [ClassSheet],
  templateUrl: './notas-page.html'
})
export class NotasPage {}
