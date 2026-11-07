import { Component, inject } from '@angular/core';
import { ApiService } from '../../../../core/services/api';
import { ToastService } from '../../../../core/services/toast';
import { errorMessage } from '../../../../core/utils/format';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-boletin-page',
  imports: [Card, PageHeader, Button],
  templateUrl: './boletin-page.html'
})
export class BoletinPage {

  private api = inject(ApiService);
  private toast = inject(ToastService);

  // GET /report-cards/me (PDF) en tu backend
  async download(): Promise<void> {

    try {

      await this.api.pdf('/report-cards/me', 'boletin.pdf');

    } catch (e) {

      console.error('Error descargando PDF:', e);
      this.toast.show(errorMessage(e), 'error');
    }
  }
}
