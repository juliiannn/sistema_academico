// Fila genérica de una tabla: cualquier entidad de la API vista como pares campo → valor.
// Solo la usan los componentes GENÉRICOS (tabla, administrador CRUD, filtros), que no conocen la entidad
// que muestran. Las pantallas y servicios usan las interfaces de cada entidad (academic.model.ts, piar.model.ts...).
export interface Row {
  [field: string]: unknown;
}

/** Las filas que entrega la tabla genérica, vistas como la entidad que realmente son (p. ej. fromRows<Piar>(rows)). */
export function fromRows<T extends object>(rows: Row[]): T[] {
  return rows as unknown as T[];
}

/** Una lista de entidades tipadas, entregada a un componente genérico de tabla. */
export function toRows<T extends object>(items: T[]): Row[] {
  return items as unknown as Row[];
}

/** Una fila de la tabla genérica vista como su entidad (p. ej. asEntity<Submission>(row)). */
export function asEntity<T extends object>(row: Row): T {
  return row as unknown as T;
}

/** Una entidad o cuerpo tipado, entregado al administrador CRUD genérico (p. ej. el cuerpo que arma toBody). */
export function asRow<T extends object>(item: T): Row {
  return item as unknown as Row;
}
