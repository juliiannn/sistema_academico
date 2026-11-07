import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error(err);
    // Si Angular no logra arrancar, se muestra el error en pantalla en vez de quedar en blanco
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<pre style="padding:20px;color:#991b1b;white-space:pre-wrap;font:14px monospace">' +
      'Error al iniciar la aplicación:\n\n' + String(err?.stack || err) + '</pre>'
    );
  });
