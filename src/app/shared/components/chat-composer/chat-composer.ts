import { Component, input, output, signal } from '@angular/core';
import { Button } from '../button/button';

// Caja de texto + botón enviar. Presentacional: solo emite el texto escrito.
@Component({
  selector: 'app-chat-composer',
  imports: [Button],
  templateUrl: './chat-composer.html',
  styleUrl: './chat-composer.css'
})
export class ChatComposer {
  readonly placeholder = input('Escribe tu pregunta...');
  readonly disabled = input(false);
  readonly send = output<string>();

  readonly draft = signal('');

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  submit(event: Event): void {
    event.preventDefault();
    const text = this.draft().trim();
    if (!text || this.disabled()) {
      return;
    }
    this.send.emit(text);
    this.draft.set('');
  }
}
