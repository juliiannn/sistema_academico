import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { enumLabel } from '../../../../core/models/enums';
import { Piar } from '../../../../core/models/piar.model';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PiarPlan } from '../../components/piar-plan/piar-plan';

// Seguimiento de un PIAR: metas, ajustes razonables por materia y avance por periodo.
@Component({
  selector: 'app-piar-plan-page',
  imports: [Card, PageHeader, Button, PiarPlan],
  templateUrl: './piar-plan-page.html'
})
export class PiarPlanPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly piar = signal<Piar | null>(null);

  readonly title = computed(() => this.piar() ? `PIAR de ${this.piar()?.studentName}` : 'Seguimiento del PIAR');
  readonly subtitle = computed(() => {
    const p = this.piar();
    if (!p) {
      return 'Metas, ajustes razonables y avance por periodo.';
    }
    const course = p.courseName ? `${p.courseName} · ` : '';
    return `${course}Año escolar ${p.schoolYear} · Consentimiento del acudiente: ${enumLabel('yesNo', String(p.consentimientoAcudiente))}`;
  });
  readonly needs = computed(() => (this.piar()?.needs ?? []).map(n => n.nombre));

  back(): void {
    void this.router.navigate(['/piar']);
  }
}
