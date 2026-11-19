import { Component, ElementRef, inject, signal } from '@angular/core';

// Envuelve un <input type="password"> y agrega el "ojito" para mostrar u ocultar la contraseña.
// Uso: <app-password-toggle><input type="password" formControlName="password"></app-password-toggle>
@Component({
  selector: 'app-password-toggle',
  templateUrl: './password-toggle.html',
  styleUrl: './password-toggle.css'
})
export class PasswordToggle {

  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly visible = signal(false);

  toggle(): void {
    const input = this.host.nativeElement.querySelector('input');
    if (!input) {
      return;
    }
    this.visible.update(v => !v);
    input.type = this.visible() ? 'text' : 'password';
    input.focus();
  }
}
