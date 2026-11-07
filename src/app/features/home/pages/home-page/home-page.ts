import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteHeader } from '../../../../shared/components/site-header/site-header';
import { SiteFooter } from '../../../../shared/components/site-footer/site-footer';

// Equivale a index.html (landing institucional)
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, SiteHeader, SiteFooter],
  templateUrl: './home-page.html'
})
export class HomePage {}
