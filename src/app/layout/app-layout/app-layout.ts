import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

// Equivale a assets/js/app.js: marco (sidebar + topbar) donde se pintan las páginas privadas
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Sidebar, Topbar],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css'
})
export class AppLayout {

  private router = inject(Router);

  readonly title = signal('');

  constructor() {
    this.updateTitle();

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.updateTitle());
  }

  // El título sale de data.title de la ruta hija activa (antes: window.PAGE_TITLE)
  private updateTitle(): void {
    let route = this.router.routerState.snapshot.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    this.title.set((route.data['title'] as string | undefined) ?? '');
  }
}
