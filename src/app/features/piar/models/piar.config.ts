import { EntityConfig } from '../../../core/models/crud.model';
import { Row } from '../../../core/models/row.model';
import { API_ENDPOINTS } from '../../../core/config';
import { specialNeedIdFor, withDisability } from '../../../core/utils/piar';

// PIAR (Plan Individual de Ajustes Razonables, Decreto 1421 de 2017).
// Quién crea, edita o desactiva lo decide la tabla role_modules (módulo /piar).
// loadCatalog: trae el catálogo de necesidades educativas (GET /special-needs) para guardar la discapacidad elegida.
export function buildPiarConfig(loadCatalog: () => Promise<Row[]>): EntityConfig {
  return {
    title: 'PIAR · Estudiantes con discapacidad',
    description: 'Plan de cada estudiante: tipo de discapacidad, observaciones y ajustes razonables, y consentimiento del acudiente.',
    module: '/piar',
    endpoint: API_ENDPOINTS.piar,
    transform: withDisability,
    columns: [
      { key: 'studentName', label: 'Estudiante' },
      { key: 'schoolYear', label: 'Año escolar' },
      { key: 'disability', label: 'Discapacidad', kind: 'enum', enumKey: 'disability' },
      { key: 'observaciones', label: 'Observaciones y ajustes' },
      { key: 'consentimientoAcudiente', label: 'Consentimiento del acudiente', kind: 'enum', enumKey: 'yesNo' },
      { key: 'creado', label: 'Fecha de registro', kind: 'datetime' },
      { key: 'estado', label: 'Estado', kind: 'bool' }
    ],
    fields: [
      { name: 'studentId', label: 'Estudiante', type: 'ref', ref: 'piarStudents' },
      { name: 'schoolYear', label: 'Año escolar', type: 'number', defaultValue: String(new Date().getFullYear()) },
      { name: 'disability', label: 'Discapacidad', type: 'select', enumKey: 'disability' },
      { name: 'observaciones', label: 'Observaciones y ajustes razonables', type: 'textarea' },
      { name: 'consentimientoAcudiente', label: '¿El acudiente firmó el consentimiento?', type: 'select', enumKey: 'yesNo', defaultValue: 'true' }
    ],
    update: ['observaciones', 'consentimientoAcudiente'],
    toBody: async (body: Row, mode: 'create' | 'edit', row: Row | null) => {
      if (mode === 'edit') {
        return {
          observaciones: body['observaciones'],
          consentimientoAcudiente: body['consentimientoAcudiente'],
          fechaFin: row?.['fechaFin'] ?? null
        };
      }
      const specialNeedId = specialNeedIdFor(String(body['disability']), await loadCatalog());
      return {
        studentId: body['studentId'],
        schoolYear: body['schoolYear'],
        observaciones: body['observaciones'],
        consentimientoAcudiente: body['consentimientoAcudiente'],
        needs: [{ specialNeedId }]
      };
    },
    toggle: {
      idField: 'id',
      statusField: 'estado',
      activeValue: true,
      activateUrl: id => `${API_ENDPOINTS.piar}/${id}/activate`,
      deactivateUrl: id => `${API_ENDPOINTS.piar}/${id}/deactivate`
    }
  };
}
