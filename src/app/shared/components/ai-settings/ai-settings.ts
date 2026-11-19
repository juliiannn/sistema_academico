import { Component, OnInit, input, output, signal } from '@angular/core';
import { AiProvider, AiSettings } from '../../../core/services/ai-settings';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';

// Panel de la IA del asistente: en la nube (Groq, vía la API principal) o local (Ollama). Presentacional: emite guardar y probar.
@Component({
  selector: 'app-ai-settings',
  imports: [Alert, Button],
  templateUrl: './ai-settings.html',
  styleUrl: './ai-settings.css'
})
export class AiSettingsPanel implements OnInit {

  readonly settings = input.required<AiSettings>();
  readonly status = input('');
  readonly statusOk = input(false);
  readonly testing = input(false);

  readonly save = output<AiSettings>();
  readonly test = output<AiSettings>();

  readonly enabled = signal(false);
  readonly provider = signal<AiProvider>('cloud');
  readonly baseUrl = signal('');
  readonly model = signal('');

  ngOnInit(): void {
    const s = this.settings();
    this.enabled.set(s.enabled);
    this.provider.set(s.provider);
    this.baseUrl.set(s.baseUrl);
    this.model.set(s.model);
  }

  onText(field: 'baseUrl' | 'model', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'baseUrl') {
      this.baseUrl.set(value);
    } else {
      this.model.set(value);
    }
  }

  onEnabled(event: Event): void {
    this.enabled.set((event.target as HTMLInputElement).checked);
  }

  onProvider(value: AiProvider): void {
    this.provider.set(value);
  }

  current(): AiSettings {
    return { enabled: this.enabled(), provider: this.provider(), baseUrl: this.baseUrl(), model: this.model() };
  }

  submit(): void {
    this.save.emit(this.current());
  }
}
