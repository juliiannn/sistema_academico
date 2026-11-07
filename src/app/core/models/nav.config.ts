import { ModulePermission } from './permission.model';

// El MENÚ se arma con los módulos que llegan de la base de datos (tabla role_modules → GET /auth/me/permissions).
// Aquí solo está la presentación: icono y grupo de cada ruta. El nombre que se ve es el de la tabla modules.
export interface NavItem {
  key: string;     // ruta del módulo (/academic/grades)
  icon: string;
  label: string;   // modules.nombre
  path: string;    // ruta sin la barra inicial, para routerLink
  description: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ICONS: Record<string, string> = {
  '/dashboard': '🏠',
  '/people/students': '👨‍🎓', '/people/teachers': '👨‍🏫', '/people/coordinators': '🧑‍💼', '/people/rectors': '🎓',
  '/admin/users': '👤', '/admin/permissions': '🔐',
  '/academic/courses': '🏫', '/academic/subjects': '📚', '/academic/course-subjects': '🔗',
  '/academic/enrollments': '📝', '/academic/grades': '📊', '/academic/attendance': '📅',
  '/academic/assignments': '📌', '/academic/submissions': '📨', '/academic/schedules': '🗓️',
  '/announcements': '📣',
  '/piar': '🧩', '/piar/special-needs': '🩺', '/piar/supports': '🖼️',
  '/assistant': '🤖', '/audit': '🛡️',
  '/my/profile': '🙋', '/my/schedule': '🗓️',
  '/student/grades': '📈', '/student/attendance': '📅', '/student/assignments': '📌',
  '/student/submissions': '📨', '/student/support': '🧩', '/student/supports': '🖼️', '/student/report-card': '📄'
};

// Grupo del menú según el inicio de la ruta (el orden de esta lista es el orden de los grupos)
const GROUPS: { title: string; match: (path: string) => boolean }[] = [
  { title: 'Principal', match: p => p === '/dashboard' || p === '/announcements' },
  { title: 'Personas', match: p => p.startsWith('/people/') || p === '/admin/users' },
  { title: 'Académico', match: p => p.startsWith('/academic/') },
  { title: 'Inclusión (PIAR)', match: p => p.startsWith('/piar') },
  { title: 'Administración', match: p => p.startsWith('/admin/') || p === '/assistant' || p === '/audit' },
  { title: 'Mi espacio', match: p => p.startsWith('/my/') || p.startsWith('/student/') }
];

export function toNavItem(p: ModulePermission): NavItem {
  return {
    key: p.ruta,
    icon: ICONS[p.ruta] ?? '📁',
    label: p.modulo,
    path: p.ruta.replace(/^\//, ''),
    description: ''
  };
}

/** Agrupa los módulos visibles (puedeVer) respetando el orden en que llegan de la base de datos. */
export function buildNavGroups(permissions: ModulePermission[]): NavGroup[] {
  const visible = permissions.filter(p => p.puedeVer).map(toNavItem);
  const used = new Set<string>();

  const groups = GROUPS.map(group => {
    const items = visible.filter(item => !used.has(item.key) && group.match(item.key));
    items.forEach(item => used.add(item.key));
    return { title: group.title, items };
  });

  // Módulos nuevos que se agreguen en la base de datos con otra ruta: se muestran igual, en "Otros"
  const others = visible.filter(item => !used.has(item.key));
  if (others.length) {
    groups.push({ title: 'Otros', items: others });
  }

  return groups.filter(group => group.items.length > 0);
}
