// Equivale a rowValue() de module.js (Angular ya escapa el HTML, no hace falta UI.esc)
export function rowValue(value: unknown): string {
  if (value === true) {
    return 'Sí';
  }

  if (value === false) {
    return 'No';
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value ?? '');
}

// Mensaje legible de cualquier error capturado en un catch
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
