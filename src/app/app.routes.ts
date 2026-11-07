import { Route, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { permissionGuard } from './core/guards/permission-guard';

const SUFFIX = ' | Sistema Académico';

// Ruta privada con carga perezosa (lazy loading). TODAS pasan por permissionGuard: solo se entra si la tabla
// role_modules (base de datos) le da permiso al rol sobre el módulo. data.module / data.action afinan el permiso.
const feature = (
  path: string,
  title: string,
  loadComponent: Route['loadComponent'],
  data: Record<string, unknown> = {}
): Route => ({
  path,
  loadComponent,
  canActivate: [permissionGuard],
  data: { title, ...data },
  title: title + SUFFIX
});

export const routes: Routes = [

  // ── Públicas ─────────────────────────────────────────────
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page').then(m => m.HomePage),
    title: 'Sistema Académico'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page').then(m => m.LoginPage),
    title: 'Iniciar sesión' + SUFFIX
  },

  // ── Cambiar contraseña (requiere sesión) ─────────────────
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/change-password-page/change-password-page').then(m => m.ChangePasswordPage),
    title: 'Cambiar contraseña' + SUFFIX
  },

  // ── Privadas: dentro del layout (sidebar + topbar) ───────
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-layout/app-layout').then(m => m.AppLayout),
    children: [

      feature('dashboard', 'Dashboard', () =>
        import('./features/dashboard/pages/dashboard-page/dashboard-page').then(m => m.DashboardPage)),
      feature('announcements', 'Comunicados', () =>
        import('./features/comunicados/pages/comunicados-page/comunicados-page').then(m => m.ComunicadosPage)),

      // ── Personas ──
      feature('people/students', 'Estudiantes', () =>
        import('./features/estudiantes/pages/estudiantes-page/estudiantes-page').then(m => m.EstudiantesPage)),
      feature('people/teachers', 'Docentes', () =>
        import('./features/docentes/pages/docentes-page/docentes-page').then(m => m.DocentesPage)),
      feature('people/coordinators', 'Coordinadores', () =>
        import('./features/coordinadores/pages/coordinadores-page/coordinadores-page').then(m => m.CoordinadoresPage)),
      feature('people/rectors', 'Rectores', () =>
        import('./features/rectores/pages/rectores-page/rectores-page').then(m => m.RectoresPage)),

      // ── Administración ──
      feature('admin/users', 'Usuarios', () =>
        import('./features/usuarios/pages/usuarios-page/usuarios-page').then(m => m.UsuariosPage)),
      feature('admin/permissions', 'Roles y módulos', () =>
        import('./features/permisos/pages/permisos-page/permisos-page').then(m => m.PermisosPage)),

      // ── Académico ──
      feature('academic/courses', 'Cursos', () =>
        import('./features/cursos/pages/cursos-page/cursos-page').then(m => m.CursosPage)),
      feature('academic/subjects', 'Materias', () =>
        import('./features/materias/pages/materias-page/materias-page').then(m => m.MateriasPage)),
      feature('academic/course-subjects', 'Asignación de materias', () =>
        import('./features/asignaciones/pages/asignaciones-page/asignaciones-page').then(m => m.AsignacionesPage)),
      feature('academic/enrollments', 'Matrículas', () =>
        import('./features/matriculas/pages/matriculas-page/matriculas-page').then(m => m.MatriculasPage)),
      feature('academic/grades', 'Notas', () =>
        import('./features/notas/pages/notas-page/notas-page').then(m => m.NotasPage)),
      feature('academic/attendance', 'Asistencia', () =>
        import('./features/asistencia/pages/asistencia-page/asistencia-page').then(m => m.AsistenciaPage)),
      feature('academic/assignments', 'Actividades', () =>
        import('./features/actividades/pages/actividades-page/actividades-page').then(m => m.ActividadesPage)),
      feature('academic/submissions', 'Entregas', () =>
        import('./features/entregas/pages/entregas-page/entregas-page').then(m => m.EntregasPage)),
      feature('academic/schedules', 'Horarios', () =>
        import('./features/horarios/pages/horarios-page/horarios-page').then(m => m.HorariosPage)),

      // ── Inclusión (PIAR) ──
      feature('piar', 'PIAR', () =>
        import('./features/piar/pages/piar-page/piar-page').then(m => m.PiarPage)),
      feature('piar/disability/:code', 'PIAR por discapacidad', () =>
        import('./features/piar/pages/piar-disability-page/piar-disability-page').then(m => m.PiarDisabilityPage),
        { module: '/piar' }),
      feature('piar/special-needs', 'Necesidades educativas', () =>
        import('./features/necesidades/pages/necesidades-page/necesidades-page').then(m => m.NecesidadesPage)),
      feature('piar/supports', 'Apoyos visuales', () =>
        import('./features/apoyos-visuales/pages/apoyos-page/apoyos-page').then(m => m.ApoyosPage)),
      feature('piar/supports/new', 'Nuevo apoyo visual', () =>
        import('./features/apoyos-visuales/pages/apoyo-form-page/apoyo-form-page').then(m => m.ApoyoFormPage),
        { module: '/piar/supports', action: 'crear' }),
      feature('piar/supports/:id/edit', 'Editar apoyo visual', () =>
        import('./features/apoyos-visuales/pages/apoyo-form-page/apoyo-form-page').then(m => m.ApoyoFormPage),
        { module: '/piar/supports', action: 'editar' }),

      // ── Herramientas ──
      feature('assistant', 'Asistente de consultas', () =>
        import('./features/asistente/pages/asistente-page/asistente-page').then(m => m.AsistentePage)),
      feature('audit', 'Auditoría', () =>
        import('./features/auditoria/pages/auditoria-page/auditoria-page').then(m => m.AuditoriaPage)),

      // ── Mi espacio (estudiante y docente: la página se adapta al rol) ──
      feature('my/profile', 'Mi perfil', () =>
        import('./features/perfil/pages/perfil-page/perfil-page').then(m => m.PerfilPage)),
      feature('my/schedule', 'Mi horario', () =>
        import('./features/mi-horario/pages/mi-horario-page/mi-horario-page').then(m => m.MiHorarioPage)),
      feature('student/grades', 'Mis notas', () =>
        import('./features/mis-notas/pages/mis-notas-page/mis-notas-page').then(m => m.MisNotasPage)),
      feature('student/attendance', 'Mi asistencia', () =>
        import('./features/mi-asistencia/pages/mi-asistencia-page/mi-asistencia-page').then(m => m.MiAsistenciaPage)),
      feature('student/assignments', 'Mis actividades', () =>
        import('./features/mis-actividades/pages/mis-actividades-page/mis-actividades-page').then(m => m.MisActividadesPage)),
      feature('student/submissions', 'Mis entregas', () =>
        import('./features/entregas/pages/entregas-page/entregas-page').then(m => m.EntregasPage)),
      feature('student/support', 'Mi apoyo', () =>
        import('./features/mi-apoyo/pages/mi-apoyo-page/mi-apoyo-page').then(m => m.MiApoyoPage)),
      feature('student/supports', 'Mis apoyos visuales', () =>
        import('./features/mis-apoyos/pages/mis-apoyos-page/mis-apoyos-page').then(m => m.MisApoyosPage)),
      feature('student/report-card', 'Mi boletín', () =>
        import('./features/boletin/pages/boletin-page/boletin-page').then(m => m.BoletinPage))
    ]
  },

  // ── Comodín ──────────────────────────────────────────────
  { path: '**', redirectTo: '' }
];
