import { Component } from '@angular/core';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-site-footer',
  imports: [Logo],
  templateUrl: './site-footer.html'
})
export class SiteFooter {
  readonly year = new Date().getFullYear();
}
