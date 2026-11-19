import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth-service';
import { SavedOrder } from '../order';
import { OrderService } from '../order-service';
import { ToastService } from '../toast-service';

// "My Account": who is signed in, and their past orders (read from MongoDB)
@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink],
  selector: 'app-account',
  styleUrl: './account.css',
  templateUrl: './account.html',
})
export class Account {
  protected auth = inject(AuthService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private toast = inject(ToastService);

  protected orders = signal<SavedOrder[]>([]);
  protected loading = signal(true);
  protected errorMessage = signal('');

  constructor() {
    this.orderService.getMyOrders().subscribe({
      next: (list) => {
        this.orders.set(list);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        if (error.status === 401) {
          // The saved login has expired: sign out and ask them to sign in again
          this.auth.logout();
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/account' } });
        } else {
          this.errorMessage.set("Sorry, we couldn't load your orders. Please refresh the page.");
        }
      }
    });
  }

  protected fulfillmentText(order: SavedOrder): string {
    if (order.fulfillment === 'court') return 'Delivery to court ' + order.courtNumber;
    if (order.fulfillment === 'pickup') return 'Pickup at the CourtSide front desk';
    return 'No pickup or delivery needed';
  }

  protected signOut(): void {
    this.auth.logout();
    this.toast.show("You've been signed out.");
    this.router.navigate(['/']);
  }
}
