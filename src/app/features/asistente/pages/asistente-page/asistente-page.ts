import { Component, computed, inject, signal } from '@angular/core';
import { ColumnDef, Option } from '../../../../core/models/crud.model';
import { AiSettings, AiSettingsService } from '../../../../core/services/ai-settings';
import { AssistantService } from '../../../../core/services/assistant';
import { OllamaService } from '../../../../core/services/ollama';
import { CloudAiService } from '../../../../core/services/cloud-ai';
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
  rows: readonly object[];   // filas de la tabla de la respuesta (cualquier entidad)
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
  private cloudAi = inject(CloudAiService);

  readonly settings = this.aiSettings.settings;
  readonly canConfigure = this.aiSettings.canConfigure;
  readonly engine = computed(() => {
    const s = this.settings();
    if (!s.enabled) { return 'Asistente básico (reglas)'; }
    return s.provider === 'cloud' ? 'IA en la nube (Groq)' : `IA local · ${s.model}`;
  });
  readonly showSettings = signal(false);
  readonly testing = signal(false);
  readonly aiStatus = signal('');
  readonly aiStatusOk = signal(false);

  readonly allowed = this.assistant.canUse();
  readonly examples: Option[] = this.assistant.examples.map(text => ({ value: text, label: text }));

  readonly messages = signal<ChatMessage[]>([
    {
      id: 0, author: 'assistant', isError: false, columns: [], rows: [], query: '',
      text: 'Hola, soy el asistente pedagógico. Puedo resumir notas y asistencia, detectar estudiantes que necesitan refuerzo, ' +
        'sugerir ajustes razonables para el PIAR y redactar mensajes o actividades. Uso solo los datos que tu rol puede ver y no modifico nada.'
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
    const engine = !next.enabled ? 'el asistente básico' : next.provider === 'cloud' ? 'la IA en la nube (Groq)' : 'tu IA local (Ollama)';
    this.aiStatus.set(`Guardado. El chat usará ${engine}.`);
    this.aiStatusOk.set(true);
  }

  async testConnection(current: AiSettings): Promise<void> {
    this.testing.set(true);
    const status = current.provider === 'cloud'
      ? await this.cloudAi.check()
      : await this.ollama.check(current.baseUrl.trim().replace(/\/+$/, ''));
    this.aiStatus.set(status.message);
    this.aiStatusOk.set(status.ok);
    this.testing.set(false);
  }

  clear(): void {
    this.assistant.reset();
    this.messages.update(list => list.slice(0, 1));
  }
}
