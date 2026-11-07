import { Component, input } from '@angular/core';
import { DisabilityGuide as Guide } from '../../../core/models/disability-guide';

// Guía PIAR de una discapacidad: ajustes por área y consejos para hacer las actividades
@Component({
  selector: 'app-disability-guide',
  templateUrl: './disability-guide.html',
  styleUrl: './disability-guide.css'
})
export class DisabilityGuide {
  readonly guide = input.required<Guide>();
  readonly showAreas = input(true);
  readonly showTips = input(true);
  readonly tipsTitle = input('Apoyos para realizar las actividades');
}
