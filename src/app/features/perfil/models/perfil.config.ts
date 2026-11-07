import { SelfViewConfig } from '../../../core/models/crud.model';

const PERSONAL = [
  { key: 'fullName', label: 'Nombre completo' },
  { key: 'documentType', label: 'Tipo de documento', enumKey: 'documentType' },
  { key: 'document', label: 'Documento' },
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'birthDate', label: 'Fecha de nacimiento' },
  { key: 'gender', label: 'Género', enumKey: 'gender' },
  { key: 'address', label: 'Dirección' }
];

export const PERFIL_ESTUDIANTE_CONFIG: SelfViewConfig = {
  title: 'Mi perfil',
  description: 'Tus datos personales y los de tu acudiente.',
  endpoint: '/students/me',
  kind: 'detail',
  details: [
    ...PERSONAL,
    { key: 'guardianName', label: 'Acudiente' },
    { key: 'guardianPhone', label: 'Teléfono del acudiente' },
    { key: 'guardianEmail', label: 'Correo del acudiente' }
  ]
};

export const PERFIL_DOCENTE_CONFIG: SelfViewConfig = {
  title: 'Mi perfil',
  description: 'Tus datos personales y laborales.',
  endpoint: '/teachers/me',
  kind: 'detail',
  details: [
    ...PERSONAL,
    { key: 'employeeCode', label: 'Código de empleado' },
    { key: 'hireDate', label: 'Fecha de contratación' },
    { key: 'profession', label: 'Profesión' },
    { key: 'specialty', label: 'Especialidad' },
    { key: 'educationLevel', label: 'Nivel educativo', enumKey: 'educationLevel' },
    { key: 'contractType', label: 'Tipo de contrato', enumKey: 'contractType' }
  ]
};
