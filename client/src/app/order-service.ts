import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { NewOrder, OrderResult, SavedOrder } from './order';

@Service()
export class OrderService {
  private http = inject(HttpClient);

  // Sends the order to Express, which prices it from the database and saves it in MongoDB
  placeOrder(order: NewOrder): Observable<OrderResult> {
    return this.http.post<OrderResult>('/api/orders', order);
  }

  // The signed-in customer's own orders (the login token is added automatically by the interceptor)
  getMyOrders(): Observable<SavedOrder[]> {
    return this.http.get<SavedOrder[]>('/api/orders/mine');
  }

  // Finds one order. The server needs BOTH the order number and the email it was placed with.
  lookupOrder(orderNumber: string, email: string): Observable<SavedOrder> {
    return this.http.get<SavedOrder>('/api/orders/lookup', { params: { orderNumber, email } });
  }
}
