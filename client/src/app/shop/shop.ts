import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../product';
import { ProductService } from '../product-service';

@Component({
  imports: [CurrencyPipe],
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

  // "Trail Mix" -> "TM", "Tennis Bag" -> "TB" (used for the photo placeholder)
  protected initials(name: string): string {
    return name
      .split(' ')
      .filter((word) => /^[A-Za-z]/.test(word))
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }
}
