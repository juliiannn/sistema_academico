import { ColumnDef } from '../models/crud.model';
import { Row } from '../models/row.model';
import { enumLabel } from '../models/enums';

// Textos de DataTables en español (sin descargar archivos externos)
export const SPANISH_LANGUAGE = {
  emptyTable: 'No hay registros para mostrar.',
  zeroRecords: 'No se encontraron resultados.',
  info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
  infoEmpty: 'Sin registros',
  infoFiltered: '(filtrado de _MAX_ registros)',
  lengthMenu: 'Mostrar _MENU_',
  search: 'Buscar:',
  searchPlaceholder: 'Escribe un nombre...',
  paginate: { first: '«', previous: 'Anterior', next: 'Siguiente', last: '»' }
};

export interface TableAction {
  key: string;
  label: string;
  variant: 'primary' | 'secondary' | 'danger' | 'warning';
}

// "2026-11-06T14:30:00.000Z" -> "06/11/2026 14:30"
export function formatDateTime(value: unknown): string {
  if (!value) {
    return '';
  }
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Texto plano de una celda: se usa para ORDENAR y BUSCAR (por eso se busca por nombre y no por id)
export function cellText(value: unknown, column: ColumnDef): string {

  if (column.kind === 'bool') {
    return value ? 'Activo' : 'Inactivo';
  }

  if (column.kind === 'enum') {
    return enumLabel(column.enumKey, value);
  }

  if (column.kind === 'datetime') {
    return formatDateTime(value);
  }

  if (value === null || value === undefined) {
    return '';
  }

  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

// HTML de una celda: escapado, con insignias para estados
export function cellHtml(value: unknown, column: ColumnDef): string {

  const text = escapeHtml(cellText(value, column));

  if (column.kind === 'bool') {
    return `<span class="badge ${value ? 'success' : 'danger'}">${text}</span>`;
  }

  return text;
}

// HTML de los botones de una fila. El clic se resuelve por delegación (data-action / data-index)
export function actionsHtml(actions: TableAction[], index: number): string {
  return actions
    .map(action =>
      `<button type="button" class="btn btn-sm btn-${action.variant}" ` +
      `data-action="${escapeHtml(action.key)}" data-index="${index}">${escapeHtml(action.label)}</button>`
    )
    .join(' ');
}

// Definición de columnas que entiende DataTables ({ title, data, render })
export function buildDataTableColumns(
  columns: ColumnDef[],
  actionsFor: ((row: Row) => TableAction[]) | undefined,
  indexOf: (row: Row) => number
): Record<string, unknown>[] {

  const result: Record<string, unknown>[] = columns.map(column => ({
    title: column.label,
    data: column.key,
    defaultContent: '',
    render: (value: unknown, type: string) =>
      type === 'display' ? cellHtml(value, column) : cellText(value, column)
  }));

  if (actionsFor) {
    result.push({
      title: 'Acciones',
      data: null,
      orderable: false,
      searchable: false,
      className: 'dt-actions',
      render: (_value: unknown, type: string, row: Row) =>
        type === 'display' ? actionsHtml(actionsFor(row), indexOf(row)) : ''
    });
  }

  return result;
}
