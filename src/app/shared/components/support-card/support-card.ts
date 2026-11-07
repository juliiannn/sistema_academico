import { Component, input } from '@angular/core';
import { Support, SupportStep } from '../../../core/models/aux-api.model';
import { enumLabel } from '../../../core/models/enums';
import { Attribution } from '../attribution/attribution';

// Vista de un apoyo visual: título, tipo y pasos con su pictograma
@Component({
  selector: 'app-support-card',
  imports: [Attribution],
  templateUrl: './support-card.html',
  styleUrl: './support-card.css'
})
export class SupportCard {
  readonly support = input.required<Support>();
  readonly audience = input('');

  typeLabel(tipo: string): string {
    return enumLabel('supportType', tipo);
  }

  steps(): SupportStep[] {
    return this.support().pasos ?? [];
  }

  hasPictograms(): boolean {
    return this.steps().some(step => step.pictograma !== null);
  }
}
