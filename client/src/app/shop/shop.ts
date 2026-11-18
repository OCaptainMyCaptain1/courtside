import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../product';
import { ProductCard } from '../product-card/product-card';
import { ProductService } from '../product-service';

@Component({
  imports: [ProductCard],
  selector: 'app-shop',
  styleUrl: './shop.css',
  templateUrl: './shop.html',
})
export class Shop {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);

  // Page text comes from the route definition in app.routes.ts
  protected heading: string = this.route.snapshot.data['heading'];
  protected lead: string = this.route.snapshot.data['lead'] ?? '';
  protected note: string = this.route.snapshot.data['note'];

  protected products = signal<Product[]>([]);
  protected loading = signal(true);
  protected errorMessage = signal('');

  constructor() {
    const category: string = this.route.snapshot.data['category'];

    this.productService.getProducts(category).subscribe({
      next: (list) => {
        this.products.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set("Sorry, we couldn't load these products. Please refresh the page.");
        this.loading.set(false);
      }
    });
  }
}
