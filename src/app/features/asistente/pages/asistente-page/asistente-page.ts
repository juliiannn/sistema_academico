import { Component, computed, inject, signal } from '@angular/core';
import { ColumnDef, Option } from '../../../../core/models/crud.model';
import { Row } from '../../../../core/models/row.model';
import { AiSettings, AiSettingsService } from '../../../../core/services/ai-settings';
import { AssistantService } from '../../../../core/services/assistant';
import { OllamaService } from '../../../../core/services/ollama';
import { errorMessage } from '../../../../core/utils/format';
import { AiSettingsPanel } from '../../../../shared/components/ai-settings/ai-settings';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { ChatBubble } from '../../../../shared/components/chat-bubble/chat-bubble';
import { ChatComposer } from '../../../../shared/components/chat-composer/chat-composer';
import { ChipList } from '../../../../shared/components/chip-list/chip-list';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

interface ChatMessage {
  id: number;
  author: 'user' | 'assistant';
  text: string;
  columns: ColumnDef[];
  rows: Row[];
  query: string;
  isError: boolean;
}

// Chat de consultas a la base de datos (solo lectura) para administración, rectoría y coordinación
@Component({
  selector: 'app-asistente-page',
  imports: [Card, PageHeader, Alert, Button, ChatBubble, ChatComposer, ChipList, AiSettingsPanel],
  templateUrl: './asistente-page.html',
  styleUrl: './asistente-page.css'
})
export class AsistentePage {

  private assistant = inject(AssistantService);
  private aiSettings = inject(AiSettingsService);
  private ollama = inject(OllamaService);

  readonly settings = this.aiSettings.settings;
  readonly engine = computed(() => (this.settings().enabled ? `IA local · ${this.settings().model}` : 'Asistente básico (reglas)'));
  readonly showSettings = signal(false);
  readonly testing = signal(false);
  readonly aiStatus = signal('');
  readonly aiStatusOk = signal(false);

  readonly allowed = this.assistant.canUse();
  readonly examples: Option[] = this.assistant.examples.map(text => ({ value: text, label: text }));

  readonly messages = signal<ChatMessage[]>([
    {
      id: 0, author: 'assistant', isError: false, columns: [], rows: [], query: '',
      text: 'Hola, soy el asistente de consultas. Pregúntame por estudiantes, notas, asistencia, matrículas, PIAR o apoyos visuales. ' +
        'Solo leo datos: no modifico nada.'
    }
  ]);

  readonly busy = signal(false);
  readonly hasConversation = computed(() => this.messages().length > 1);

  private nextId = 1;

  private push(message: Omit<ChatMessage, 'id'>): void {
    this.messages.update(list => [...list, { ...message, id: this.nextId++ }]);
  }

  async ask(text: string): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.push({ author: 'user', text, columns: [], rows: [], query: '', isError: false });
    this.busy.set(true);

    try {
      const reply = await this.assistant.ask(text);
      this.push({
        author: 'assistant', text: reply.text, columns: reply.columns ?? [], rows: reply.rows ?? [],
        query: reply.query, isError: false
      });
    } catch (error) {
      this.push({ author: 'assistant', text: errorMessage(error), columns: [], rows: [], query: '', isError: true });
    }

    this.busy.set(false);
  }

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }

  saveSettings(next: AiSettings): void {
    this.aiSettings.update(next);
    this.aiStatus.set(next.enabled ? 'Guardado. El chat usará tu IA local.' : 'Guardado. El chat usará el asistente básico.');
    this.aiStatusOk.set(true);
  }

  async testConnection(baseUrl: string): Promise<void> {
    this.testing.set(true);
    const status = await this.ollama.check(baseUrl.trim().replace(/\/+$/, ''));
    this.aiStatus.set(status.message);
    this.aiStatusOk.set(status.ok);
    this.testing.set(false);
  }

  clear(): void {
    this.assistant.reset();
    this.messages.update(list => list.slice(0, 1));
  }
}
