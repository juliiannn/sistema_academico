import { Component, input } from '@angular/core';

// Atribución obligatoria de los pictogramas (ARASAAC, licencia CC BY-NC-SA)
@Component({
  selector: 'app-attribution',
  templateUrl: './attribution.html',
  styleUrl: './attribution.css'
})
export class Attribution {
  readonly text = input('Pictogramas: ARASAAC (https://arasaac.org), propiedad del Gobierno de Aragón, autor Sergio Palao. Licencia CC BY-NC-SA.');
}
