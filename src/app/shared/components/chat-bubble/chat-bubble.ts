import { Component, input } from '@angular/core';
import { ColumnDef } from '../../../core/models/crud.model';
import { Row } from '../../../core/models/row.model';
import { DataTable } from '../data-table/data-table';

// Burbuja de conversación: texto, y si la respuesta trae datos, una tabla DataTables con la consulta ejecutada
@Component({
  selector: 'app-chat-bubble',
  imports: [DataTable],
  templateUrl: './chat-bubble.html',
  styleUrl: './chat-bubble.css'
})
export class ChatBubble {
  readonly author = input<'user' | 'assistant'>('assistant');
  readonly text = input.required<string>();
  readonly columns = input<ColumnDef[]>([]);
  readonly rows = input<Row[]>([]);
  readonly query = input('');
  readonly isError = input(false);
}
