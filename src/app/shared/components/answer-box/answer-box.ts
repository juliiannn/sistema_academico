import { Component, OnInit, input, output, signal } from '@angular/core';
import { Button } from '../button/button';

// Cuadro de texto para escribir una respuesta (con contador). Presentacional: emite el texto al enviar.
@Component({
  selector: 'app-answer-box',
  imports: [Button],
  templateUrl: './answer-box.html',
  styleUrl: './answer-box.css'
})
export class AnswerBox implements OnInit {

  readonly initial = input('');
  readonly label = input('Tu respuesta');
  readonly submitLabel = input('Enviar respuesta');
  readonly maxLength = input(5000);
  readonly saving = input(false);

  readonly send = output<string>();

  readonly text = signal('');

  ngOnInit(): void {
    this.text.set(this.initial());
  }

  onInput(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  submit(event: Event): void {
    event.preventDefault();
    const value = this.text().trim();
    if (value && !this.saving()) {
      this.send.emit(value);
    }
  }
}
