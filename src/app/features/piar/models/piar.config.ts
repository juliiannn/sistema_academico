import { EntityConfig } from '../../../core/models/crud.model';
import { Piar, PiarCreateRequest, PiarUpdateRequest, SpecialNeed } from '../../../core/models/piar.model';
import { Row, asEntity, asRow, fromRows, toRows } from '../../../core/models/row.model';
import { API_ENDPOINTS } from '../../../core/config';
import { specialNeedIdFor, withDisability } from '../../../core/utils/piar';

// PIAR (Plan Individual de Ajustes Razonables, Decreto 1421 de 2017).
// Quién crea, edita o desactiva lo decide la tabla role_modules (módulo /piar).
// loadCatalog: trae el catálogo de necesidades educativas (GET /special-needs) para guardar la discapacidad elegida.
export function buildPiarConfig(loadCatalog: () => Promise<SpecialNeed[]>): EntityConfig {
  return {
    title: 'PIAR · Estudiantes con discapacidad',
    description: 'Plan de cada estudiante: tipo de discapacidad, observaciones y ajustes razonables, y consentimiento del acudiente.',
    module: '/piar',
    endpoint: API_ENDPOINTS.piar,
    transform: rows => toRows(withDisability(fromRows<Piar>(rows))),
    extraActions: [{ key: 'plan', label: 'Seguimiento', variant: 'primary' }],
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
      // body = valores del formulario (texto); se arma el cuerpo tipado que espera la API
      const observaciones = body['observaciones'] ? String(body['observaciones']) : null;
      const consentimientoAcudiente = String(body['consentimientoAcudiente']) === 'true';
      if (mode === 'edit') {
        const update: PiarUpdateRequest = {
          observaciones, consentimientoAcudiente, fechaFin: row ? asEntity<Piar>(row).fechaFin : null
        };
        return asRow(update);
      }
      const specialNeedId = specialNeedIdFor(String(body['disability']), await loadCatalog());
      const create: PiarCreateRequest = {
        studentId: Number(body['studentId']),
        schoolYear: Number(body['schoolYear']),
        observaciones, consentimientoAcudiente,
        needs: [{ specialNeedId }]
      };
      return asRow(create);
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
