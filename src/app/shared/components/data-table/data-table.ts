import { Component, ElementRef, OnDestroy, effect, input, output, untracked, viewChild } from '@angular/core';
import { ColumnDef } from '../../../core/models/crud.model';
import { Row, toRows } from '../../../core/models/row.model';
import { SPANISH_LANGUAGE, TableAction, buildDataTableColumns } from '../../../core/utils/datatable';

/** Lo que la tabla usa de una instancia de DataTables. */
interface DataTableInstance {
  clear(): DataTableInstance;
  rows: { add(data: Row[]): DataTableInstance };
  draw(keepPaging?: boolean): DataTableInstance;
  destroy(): void;
}

/** Opciones con que se crea la tabla. */
interface DataTableOptions {
  data: Row[];
  columns: object[];
  pageLength: number;
  lengthMenu: number[];
  order: unknown[];
  autoWidth: boolean;
  language: object;
}

/** Constructor que exporta la librería datatables.net. */
type DataTableConstructor = new (element: HTMLTableElement, options: DataTableOptions) => DataTableInstance;

/** Lo que exporta el paquete datatables.net. */
interface DataTablesModule {
  default: DataTableConstructor;
}

/** Estructura con que se construyó la tabla (si no cambia, solo se reemplazan los datos). */
interface TableStructure {
  columns: ColumnDef[];
  actions: unknown;
  size: number;
}

export interface TableActionEvent {
  action: string;
  row: Row;
}

// TODAS las tablas de la app usan este componente, que envuelve la librería DataTables
// (búsqueda, orden por columna, paginación). DataTables dibuja la tabla; Angular solo le entrega
// los datos, y los botones de cada fila se resuelven por delegación de eventos.
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.html',
  styleUrl: './data-table.css'
})
export class DataTable implements OnDestroy {

  readonly columns = input.required<ColumnDef[]>();
  // Acepta cualquier lista de entidades tipadas (Grade[], Piar[]...): la tabla solo lee sus campos por nombre
  readonly data = input<readonly object[]>([]);

  // Función que devuelve los botones de cada fila (si no se pasa, no hay columna "Acciones")
  readonly actions = input<((row: Row) => TableAction[]) | undefined>(undefined);

  readonly pageSize = input(10);

  readonly action = output<TableActionEvent>();

  private readonly tableRef = viewChild<ElementRef<HTMLTableElement>>('tbl');

  private instance: DataTableInstance | null = null;
  private rows: Row[] = [];
  private index = new Map<Row, number>();
  private ticket = 0;
  private destroyed = false;
  private listeningOn: HTMLTableElement | null = null;
  private built: TableStructure | null = null;

  private readonly onClick = (event: Event): void => {

    const target = event.target as HTMLElement | null;
    const button = target?.closest('button[data-action]') as HTMLButtonElement | null;

    if (!button) {
      return;
    }

    const row = this.rows[Number(button.dataset['index'])];

    if (row) {
      this.action.emit({ action: button.dataset['action'] ?? '', row });
    }
  };

  constructor() {
    effect(() => {
      const element = this.tableRef()?.nativeElement;
      const columns = this.columns();
      const data = toRows([...this.data()]);
      const actions = this.actions();
      const size = this.pageSize();

      if (element) {
        untracked(() => {
          void this.refresh(element, columns, data, actions, size);
        });
      }
    });
  }

  private async refresh(
    element: HTMLTableElement,
    columns: ColumnDef[],
    data: Row[],
    actions: ((row: Row) => TableAction[]) | undefined,
    size: number
  ): Promise<void> {

    this.rows = data;
    this.index = new Map(data.map((row, i) => [row, i]));
    this.listen(element);

    const current = this.instance;
    const sameStructure =
      current !== null && this.built !== null &&
      this.built.columns === columns && this.built.actions === actions && this.built.size === size;

    // Solo cambiaron los datos: se reemplazan las filas conservando la página y la búsqueda actuales
    if (current && sameStructure) {
      current.clear();
      current.rows.add(data);
      current.draw(false);
      return;
    }

    const ticket = ++this.ticket;

    // La librería se descarga solo cuando se necesita una tabla
    const DataTablesLib = ((await import('datatables.net')) as unknown as DataTablesModule).default;

    if (this.destroyed || ticket !== this.ticket) {
      return;
    }

    this.instance?.destroy();

    this.instance = new DataTablesLib(element, {
      data,
      columns: buildDataTableColumns(columns, actions, row => this.index.get(row) ?? -1),
      pageLength: size,
      lengthMenu: [5, 10, 25, 50],
      order: [],
      autoWidth: false,
      language: SPANISH_LANGUAGE
    });

    this.built = { columns, actions, size };
  }

  private listen(element: HTMLTableElement): void {

    if (this.listeningOn !== element) {
      this.listeningOn?.removeEventListener('click', this.onClick);
      element.addEventListener('click', this.onClick);
      this.listeningOn = element;
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.ticket++;
    this.listeningOn?.removeEventListener('click', this.onClick);
    this.instance?.destroy();
    this.instance = null;
  }
}
