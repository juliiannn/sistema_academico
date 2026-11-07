import { Component, input } from '@angular/core';
import { Row } from '../../../core/models/row.model';
import { formatDateTime } from '../../../core/utils/datatable';

// Una entrega: quién la escribió, su texto, estado, nota y retroalimentación. Admite contenido extra (formulario de nota).
@Component({
  selector: 'app-submission-card',
  templateUrl: './submission-card.html',
  styleUrl: './submission-card.css'
})
export class SubmissionCard {
  readonly submission = input.required<Row>();
  readonly showStudent = input(false);

  when(): string {
    return formatDateTime(this.submission()['actualizado']);
  }

  isGraded(): boolean {
    return this.submission()['calificada'] === true;
  }
}
