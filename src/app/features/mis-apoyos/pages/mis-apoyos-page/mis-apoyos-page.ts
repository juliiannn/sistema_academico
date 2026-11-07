import { Component, OnInit, inject, signal } from '@angular/core';
import { Support } from '../../../../core/models/aux-api.model';
import { AuxApiService } from '../../../../core/services/aux-api';
import { errorMessage } from '../../../../core/utils/format';
import { Alert } from '../../../../shared/components/alert/alert';
import { Card } from '../../../../shared/components/card/card';
import { ConnectionBanner } from '../../../../shared/components/connection-banner/connection-banner';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SupportCard } from '../../../../shared/components/support-card/support-card';

// El estudiante ve sus apoyos visuales y los generales del aula
@Component({
  selector: 'app-mis-apoyos-page',
  imports: [Card, PageHeader, Alert, ConnectionBanner, EmptyState, LoadingState, SupportCard],
  templateUrl: './mis-apoyos-page.html'
})
export class MisApoyosPage implements OnInit {

  private api = inject(AuxApiService);

  readonly online = this.api.online;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly supports = signal<Support[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.supports.set(await this.api.mySupports());
      this.api.online.set(true);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
    this.loading.set(false);
  }

  audience(support: Support): string {
    return support.general ? 'Todo el aula' : 'Para ti';
  }
}
