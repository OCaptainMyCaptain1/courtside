import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth-service';
import { CartService } from '../cart-service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  protected cart = inject(CartService);
  protected auth = inject(AuthService);

  // The Cart link opens a panel instead of going to a page
  protected openCart(event: Event): void {
    event.preventDefault();
    this.cart.open(event.currentTarget as HTMLElement);
  }
}
