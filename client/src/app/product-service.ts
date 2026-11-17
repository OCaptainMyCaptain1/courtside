import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from './product';

@Service()
export class ProductService {
  private http = inject(HttpClient);

  // Asks the Express server for one category of products (it reads them from MongoDB)
  getProducts(category: string): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products', { params: { category } });
  }
}
