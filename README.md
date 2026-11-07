# Sistema Académico · Frontend Angular

Frontend del sistema académico con **Angular 22**. Se comunica con dos APIs:

| API | Tecnología | Local | Para qué |
|---|---|---|---|
| `api_principal` | FastAPI + PostgreSQL | `http://localhost:8000` | login JWT, roles y módulos, todo lo académico |
| `api_auxiliar` | Express + MySQL | `http://localhost:4000` | apoyos visuales (pictogramas ARASAAC) y auditoría |

## Cómo se cumple el taller

- **Login con JWT y roles.** `POST /auth/login` devuelve `accessToken` y `role`. El MISMO token se envía a las dos APIs
  (`Authorization: Bearer`); la API auxiliar lo valida con el mismo `JWT_SECRET`.
- **Módulos cargados SOLO desde la base de datos (tabla rol x módulo).** Después del login se llama
  `GET /auth/me/permissions` (`core/services/permissions.ts`). Con esa respuesta:
  - se arma el menú lateral y los accesos del dashboard (`core/models/nav.config.ts` solo pone iconos y grupos);
  - `permissionGuard` deja entrar a una ruta solo si el rol tiene `puede_ver` en ese módulo;
  - los botones **+ Nuevo / Editar / Desactivar** salen de `puede_crear / puede_editar / puede_eliminar`.
  - El administrador cambia los permisos en **Roles y módulos** y el menú del rol cambia al volver a entrar.
- **CRUD en todos los roles** (eliminar = cambiar el estado): Admin (todo), Rector (Comunicados), Coordinador
  (Matrículas, PIAR, Apoyos visuales), Docente (Notas, Asistencia, Actividades, calificar Entregas, Apoyos), Estudiante
  (Mis entregas).
- **Lo que hace un rol se ve en los otros:** el docente califica una entrega → el estudiante ve la nota y la
  retroalimentación en *Mis entregas* y *Mis actividades*; el rector publica un comunicado → aparece en el dashboard
  de todos.
- **DataTables** (`datatables.net`) en todas las tablas, en español.
- **Ningún ID visible ni para escribir:** las tablas muestran nombres y los formularios usan selectores por nombre.
- **Componentes reutilizables** en `src/app/shared/components` (21 se usan en dos o más pantallas).

## Ejecutar en local

```bash
npm install
ng serve            # usa src/environments/environment.development.ts (APIs en localhost:8000 y :4000)
```

Antes, en la base de datos de la API principal ejecuta una vez `api_principal/sql/migracion_modulos_angular.sql`.

## Publicar en la nube

1. Despliega las dos APIs (por ejemplo en Render) y copia sus URLs.
2. Pon esas URLs en `src/environments/environment.ts` (`mainApiUrl`, `auxApiUrl`).
3. `ng build` → la carpeta `dist/sistema-academico/browser` se sube a Vercel o Netlify
   (`vercel.json` y `public/_redirects` ya están configurados para que las rutas de Angular funcionen al recargar).
4. En las APIs pon en `CORS_ORIGINS` / `CORS_ORIGIN` la URL del Angular publicado.

---

## Angular CLI

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
