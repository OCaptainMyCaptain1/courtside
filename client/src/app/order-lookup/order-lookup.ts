import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SavedOrder } from '../order';
import { OrderService } from '../order-service';

// "Find My Order": looks an order up in MongoDB by order number AND email
@Component({
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  selector: 'app-order-lookup',
  styleUrl: './order-lookup.css',
  templateUrl: './order-lookup.html',
})
export class OrderLookup {
  private orders = inject(OrderService);

  protected form = new FormGroup({
    orderNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
  });

  protected loading = signal(false);
  protected errorMessage = signal('');
  protected order = signal<SavedOrder | null>(null);

  protected find(): void {
    this.order.set(null);
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.errorMessage.set('Enter your order number and the email you used when you ordered.');
      return;
    }

    const value = this.form.getRawValue();
    this.loading.set(true);

    this.orders.lookupOrder(value.orderNumber.trim().toUpperCase(), value.email.trim()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.error ?? "We couldn't look up that order. Please try again.");
        this.loading.set(false);
      }
    });
  }

  protected fulfillmentText(order: SavedOrder): string {
    if (order.fulfillment === 'court') return 'Delivery to court ' + order.courtNumber;
    if (order.fulfillment === 'pickup') return 'Pickup at the CourtSide front desk';
    return 'No pickup or delivery needed';
  }
}
