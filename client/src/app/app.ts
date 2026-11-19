import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth-service';
import { CartDrawer } from './cart-drawer/cart-drawer';
import { Footer } from './footer/footer';
import { Header } from './header/header';
import { Toast } from './toast/toast';

@Component({
  imports: [RouterOutlet, Header, Footer, CartDrawer, Toast],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    // If the customer was signed in last time, check that their saved login still works
    inject(AuthService).restoreSession();
  }

  // A plain "#main" link would reload the page here (because of the <base href>), so we move focus ourselves
  skipToMain(event: Event): void {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }
}
