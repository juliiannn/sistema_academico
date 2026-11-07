import { Component } from '@angular/core';
import { StudentActivities } from '../../../actividades/components/student-activities/student-activities';

// "Mis actividades" usa el mismo cuadro de respuestas que la pantalla Actividades del estudiante
@Component({
  selector: 'app-mis-actividades-page',
  imports: [StudentActivities],
  templateUrl: './mis-actividades-page.html'
})
export class MisActividadesPage {}
