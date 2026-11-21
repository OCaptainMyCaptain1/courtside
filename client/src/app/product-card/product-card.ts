import { CurrencyPipe } from '@angular/common';
import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { CartService, calculateTax, TAX_PERCENT_TEXT } from '../cart-service';
import { Product } from '../product';
import { productInitials } from '../product-utils';
import { ToastService } from '../toast-service';

type TensionUnit = 'lb' | 'kg';

const KG_PER_LB = 0.45359237;

// Settings for the string tension box in each unit
const TENSION = {
  lb: {
    min: 40, max: 70, step: 1, suffix: ' lbs', label: 'Tension (lbs):', placeholder: 'e.g. 55',
    hint: 'Range: 40 to 70 lbs, whole numbers.',
    error: 'Enter a whole-number tension between 40 and 70 lbs.'
  },
  kg: {
    min: 18, max: 32, step: 0.5, suffix: ' kg', label: 'Tension (kg):', placeholder: 'e.g. 25',
    hint: 'Range: 18 to 32 kg, in steps of 0.5.',
    error: 'Enter a tension between 18 and 32 kg, in steps of 0.5 (for example 24.5).'
  }
};

// One product on a shop page. Each card keeps its own choices (selected option, tension, unit).
@Component({
  imports: [CurrencyPipe],
  selector: 'app-product-card',
  styleUrl: './product-card.css',
  templateUrl: './product-card.html',
  host: { class: 'product-card' }   // the card element itself is the styled .product-card box
})
export class ProductCard {
  readonly product = input.required<Product>();

  private cart = inject(CartService);
  private toast = inject(ToastService);

  protected initials = productInitials;
  protected taxText = TAX_PERCENT_TEXT;
  protected tensionSettings = TENSION;

  // What the customer has chosen so far
  protected selectedIndex = signal(0);
  protected unit = signal<TensionUnit>('lb');
  protected tension = signal('');
  protected tensionError = signal('');

  private tensionInput = viewChild<ElementRef<HTMLInputElement>>('tensionInput');

  protected selectedOption = computed(() => this.product().options[this.selectedIndex()]);

  // Price of one unit: an option can have its own price (grip type), otherwise the product price
  protected unitPrice = computed(() => this.selectedOption()?.price ?? this.product().price);

  // Number of days for rentals, otherwise 1
  protected days = computed(() => (this.product().pricing === 'perDay' ? this.selectedOption()?.days ?? 1 : 1));

  // Price that goes in the cart (rentals are price per day x days)
  protected itemPrice = computed(() => Math.round(this.unitPrice() * this.days() * 100) / 100);

  // The live "estimated total" line, with tax included
  protected estimatedTotal = computed(() => Math.round((this.itemPrice() + calculateTax(this.itemPrice())) * 100) / 100);

  protected chooseOption(index: number): void {
    this.selectedIndex.set(index);
  }

  // ---------- String tension ----------

  protected onTensionInput(event: Event): void {
    this.tension.set((event.target as HTMLInputElement).value);
    this.tensionError.set('');
  }

  protected changeUnit(newUnit: TensionUnit): void {
    // Keep what the customer already typed, converted to the new unit
    const typed = this.tension().trim();
    if (typed !== '' && !isNaN(Number(typed))) {
      this.tension.set(String(this.convertTension(Number(typed), newUnit)));
    }
    this.tensionError.set('');
    this.unit.set(newUnit);
  }

  private convertTension(value: number, to: TensionUnit): number {
    const settings = TENSION[to];
    const converted = to === 'kg'
      ? Math.round(value * KG_PER_LB * 2) / 2   // nearest half kilogram
      : Math.round(value / KG_PER_LB);          // nearest whole pound
    return Math.min(settings.max, Math.max(settings.min, converted));
  }

  private tensionIsValid(): boolean {
    const text = this.tension().trim();
    if (text === '') return false;
    const value = Number(text);
    if (!Number.isFinite(value)) return false;

    const settings = TENSION[this.unit()];
    if (value < settings.min || value > settings.max) return false;
    return Number.isInteger(value / settings.step);
  }

  // ---------- Add to Cart ----------

  protected addToCart(): void {
    const product = this.product();

    // 1. Check the typed-in tension before adding anything
    if (product.hasTension && !this.tensionIsValid()) {
      this.tensionError.set(TENSION[this.unit()].error);
      this.tensionInput()?.nativeElement.focus();
      return;
    }

    // 2. Collect the choices in page order (the lbs/kg switch is skipped: its unit is already in the tension text)
    const parts: string[] = [];
    if (product.optionLabel && this.selectedOption()) parts.push(this.selectedOption().value);
    if (product.hasTension) parts.push(this.tension().trim() + TENSION[this.unit()].suffix);
    const options = parts.join(', ');

    // 3. Add it and confirm
    this.cart.add(product.name, this.itemPrice(), options, product.image);
    this.toast.show(product.name + (options ? ' (' + options + ')' : '') + ' added to your cart.', {
      actionLabel: 'View cart',
      onAction: (opener) => this.cart.open(opener)
    });
  }
}
