import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, Logo],
  templateUrl: './site-header.html'
})
export class SiteHeader {}
