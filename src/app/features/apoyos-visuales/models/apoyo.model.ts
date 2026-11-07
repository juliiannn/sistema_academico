import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Support, SupportInput } from '../../../core/models/aux-api.model';
import { ColumnDef } from '../../../core/models/crud.model';

export const MAX_STEPS = 30;

export const APOYOS_COLUMNS: ColumnDef[] = [
  { key: 'titulo', label: 'Título' },
  { key: 'tipo', label: 'Tipo', kind: 'enum', enumKey: 'supportType' },
  { key: 'studentName', label: 'Para' },
  { key: 'total_pasos', label: 'Pasos' },
  { key: 'creatorName', label: 'Creado por' },
  { key: 'creado', label: 'Fecha', kind: 'datetime' },
  { key: 'estado', label: 'Estado', kind: 'bool' }
];

export interface StepValue {
  texto: string;
  duracion_minutos: string;
  arasaac_id: number | null;
  palabra: string;
  imagen_url: string;
}

export function newStepGroup(value: Partial<StepValue> = {}): FormGroup {
  return new FormGroup({
    texto: new FormControl(value.texto ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    duracion_minutos: new FormControl(value.duracion_minutos ?? '', { nonNullable: true, validators: [Validators.min(1), Validators.max(240)] }),
    arasaac_id: new FormControl<number | null>(value.arasaac_id ?? null),
    palabra: new FormControl(value.palabra ?? '', { nonNullable: true }),
    imagen_url: new FormControl(value.imagen_url ?? '', { nonNullable: true })
  });
}

export function newApoyoForm(): FormGroup {
  return new FormGroup({
    tipo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(150)] }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    estudiante_email: new FormControl('', { nonNullable: true }),
    pasos: new FormArray([newStepGroup()])
  });
}

// Formulario -> cuerpo que espera la API (/supports)
export function formToInput(raw: Record<string, any>): SupportInput {
  const text = (v: unknown) => String(v ?? '').trim();
  return {
    tipo: text(raw['tipo']),
    titulo: text(raw['titulo']),
    descripcion: text(raw['descripcion']) || null,
    estudiante_email: text(raw['estudiante_email']) || null,
    pasos: (raw['pasos'] as Record<string, any>[]).map(s => ({
      texto: text(s['texto']),
      arasaac_id: s['arasaac_id'] ? Number(s['arasaac_id']) : null,
      palabra: text(s['palabra']) || null,
      duracion_minutos: text(s['duracion_minutos']) ? Number(s['duracion_minutos']) : null
    }))
  };
}

// Apoyo guardado -> formulario (para editar)
export function supportToForm(form: FormGroup, support: Support): void {
  const steps = form.get('pasos') as FormArray;
  steps.clear();
  (support.pasos ?? []).forEach(step =>
    steps.push(newStepGroup({
      texto: step.texto,
      duracion_minutos: step.duracion_minutos ? String(step.duracion_minutos) : '',
      arasaac_id: step.pictograma?.arasaac_id ?? null,
      palabra: step.pictograma?.palabra ?? '',
      imagen_url: step.pictograma?.imagen_url ?? ''
    }))
  );
  if (steps.length === 0) {
    steps.push(newStepGroup());
  }
  form.patchValue({
    tipo: support.tipo,
    titulo: support.titulo,
    descripcion: support.descripcion ?? '',
    estudiante_email: support.estudiante_email ?? ''
  });
}

// Formulario -> apoyo para la vista previa en vivo
export function formToPreview(raw: Record<string, any>): Support {
  const steps = (raw['pasos'] as Record<string, any>[]) ?? [];
  return {
    id: 0, codigo: '', tipo: String(raw['tipo'] ?? ''), titulo: String(raw['titulo'] ?? '') || 'Título del apoyo',
    descripcion: String(raw['descripcion'] ?? '') || null, estudiante_email: null, general: true, creado_por: '',
    estado: true, creado: '', actualizado: '',
    pasos: steps.map((s, i) => ({
      orden: i + 1,
      texto: String(s['texto'] ?? '') || `Paso ${i + 1}`,
      duracion_minutos: s['duracion_minutos'] ? Number(s['duracion_minutos']) : null,
      pictograma: s['arasaac_id']
        ? { arasaac_id: Number(s['arasaac_id']), palabra: String(s['palabra'] ?? ''), imagen_url: String(s['imagen_url'] ?? '') }
        : null
    }))
  };
}
