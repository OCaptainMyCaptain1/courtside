import { CurrencyPipe } from '@angular/common';
import { afterNextRender, Component, effect, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService, TAX_PERCENT_TEXT } from '../cart-service';
import { productInitials } from '../product-utils';

// The slide-in cart panel. It reads everything from CartService.
@Component({
  imports: [CurrencyPipe, RouterLink],
  selector: 'app-cart-drawer',
  styleUrl: './cart-drawer.css',
  templateUrl: './cart-drawer.html',
  host: { '(document:keydown)': 'onKeydown($event)' }
})
export class CartDrawer {
  protected cart = inject(CartService);
  private injector = inject(Injector);

  protected taxText = TAX_PERCENT_TEXT;
  protected initials = productInitials;
  protected announcement = signal('');

  private drawer = viewChild.required<ElementRef<HTMLElement>>('drawer');
  private closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  constructor() {
    // When the panel opens, move keyboard focus to its Close button
    effect(() => {
      if (this.cart.isOpen()) {
        // (a short delay lets the panel's slide-in start; a hidden element cannot take focus)
        afterNextRender(() => setTimeout(() => this.closeButton().nativeElement.focus(), 50), { injector: this.injector });
      }
    });
  }

  // Tell screen reader users what changed (read aloud by the status region)
  private announce(text: string): void {
    this.announcement.set('');
    setTimeout(() => this.announcement.set(text), 50);
  }

  protected increase(index: number): void {
    const item = this.cart.items()[index];
    this.cart.changeQuantity(index, 1);
    this.announce(item.name + ', quantity ' + this.cart.items()[index].quantity + '.');
  }

  protected decrease(index: number): void {
    const item = this.cart.items()[index];
    if (item.quantity === 1) {
      this.remove(index);
      return;
    }
    this.cart.changeQuantity(index, -1);
    this.announce(item.name + ', quantity ' + this.cart.items()[index].quantity + '.');
  }

  protected remove(index: number): void {
    const item = this.cart.items()[index];
    this.cart.remove(index);
    this.announce(item.name + ' removed from cart.');

    // The list is redrawn, so put keyboard focus back where the customer was working
    setTimeout(() => {
      const remaining = this.cart.items().length;
      const root = this.drawer().nativeElement;
      const target = remaining > 0
        ? root.querySelector<HTMLElement>('.removeBtn[data-index="' + Math.min(index, remaining - 1) + '"]')
        : this.closeButton().nativeElement;
      target?.focus();
    }, 0);
  }

  // Escape closes the panel, and Tab stays inside it while it is open
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.cart.isOpen()) return;

    if (event.key === 'Escape') {
      this.cart.close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(this.drawer().nativeElement.querySelectorAll<HTMLElement>('button, a[href]'))
      .filter((element) => element.getClientRects().length > 0);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
