import { Component, OnInit, input, output, signal } from '@angular/core';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';

export interface GradeValue {
  grade: number;
  feedback: string;
}

// Nota (0 a 10) + retroalimentación escrita. Presentacional: valida y emite lo que escribió el docente.
@Component({
  selector: 'app-grade-form',
  imports: [Alert, Button],
  templateUrl: './grade-form.html',
  styleUrl: './grade-form.css'
})
export class GradeForm implements OnInit {

  readonly grade = input<number | string>('');
  readonly feedback = input('');
  readonly saving = input(false);
  readonly submitLabel = input('Guardar nota');

  readonly graded = output<GradeValue>();

  readonly gradeText = signal('');
  readonly feedbackText = signal('');
  readonly error = signal('');

  ngOnInit(): void {
    this.gradeText.set(String(this.grade() ?? ''));
    this.feedbackText.set(this.feedback());
  }

  onGrade(event: Event): void {
    this.gradeText.set((event.target as HTMLInputElement).value);
  }

  onFeedback(event: Event): void {
    this.feedbackText.set((event.target as HTMLTextAreaElement).value);
  }

  submit(event: Event): void {
    event.preventDefault();

    const grade = Number(this.gradeText());
    const feedback = this.feedbackText().trim();

    if (this.gradeText().trim() === '' || Number.isNaN(grade) || grade < 0 || grade > 10) {
      this.error.set('La nota debe estar entre 0 y 10.');
      return;
    }
    if (!feedback) {
      this.error.set('Escribe la retroalimentación para el estudiante.');
      return;
    }

    this.error.set('');
    this.graded.emit({ grade, feedback });
  }
}
