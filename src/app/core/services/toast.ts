import { Injectable, signal } from '@angular/core';

export interface ToastData {
  message: string;
  type: 'success' | 'error';
}

// Equivale a UI.toast() de ui.js
@Injectable({ providedIn: 'root' })
export class ToastService {

  private readonly _current = signal<ToastData | null>(null);
  readonly current = this._current.asReadonly();

  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string, type: 'success' | 'error' = 'success'): void {

    clearTimeout(this.timer);

    this._current.set({ message, type });

    this.timer = setTimeout(() => this._current.set(null), 3000);
  }
}
