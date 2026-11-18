import { computed, inject, Service, signal } from '@angular/core';
import { lessonProblem } from './lesson-dates';
import { ToastService } from './toast-service';

// ---------- Tax ----------

export const TAX_RATE = 0.08;
export const TAX_PERCENT_TEXT = Math.round(TAX_RATE * 100) + '%';

// Tax on a subtotal, rounded to the nearest cent
export function calculateTax(subtotal: number): number {
  return Math.round((subtotal * TAX_RATE + Number.EPSILON) * 100) / 100;
}

// ---------- Cart data ----------

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  options: string;
  type?: 'lesson';   // lessons are one-per-slot and never stack
  date?: string;
  time?: string;
}

// The cart lives here, in one place, and every component reads from it.
// Signals make the header badge, the cart panel, and checkout update by themselves.
@Service()
export class CartService {
  private toast = inject(ToastService);

  readonly items = signal<CartItem[]>(this.load());
  readonly isOpen = signal(false);

  // Values calculated from the items; they update automatically when items changes
  readonly count = computed(() => this.items().reduce((n, item) => n + item.quantity, 0));
  readonly subtotal = computed(() =>
    Math.round(this.items().reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100
  );
  readonly tax = computed(() => calculateTax(this.subtotal()));
  readonly total = computed(() => Math.round((this.subtotal() + this.tax()) * 100) / 100);
  // Snacks, gear, and services need pickup or court delivery; lessons do not
  readonly hasPhysicalItems = computed(() => this.items().some((item) => item.type !== 'lesson'));

  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    // Lessons saved days ago may have expired
    this.removeExpiredLessons();
  }

  private load(): CartItem[] {
    try {
      const data = localStorage.getItem('cart');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Every change goes through here: update the signal, then save to the browser
  private save(items: CartItem[]): void {
    this.items.set(items);
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch {
      // If the browser blocks storage, the cart still works until the page is closed
    }
  }

  // Add an item, or increase its quantity if the same name AND options are already there
  add(name: string, price: number, options: string): void {
    const items = this.items().map((item) => ({ ...item }));
    const existing = items.find((item) => item.name === name && item.options === options);

    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ name, price, quantity: 1, options });
    }
    this.save(items);
  }

  // Add a private lesson. Returns "added", "duplicate" (same coach, date, and time),
  // or "conflict" (a different coach at the same date and time).
  addLesson(name: string, price: number, options: string, date: string, time: string): 'added' | 'duplicate' | 'conflict' {
    const items = this.items();

    for (const item of items) {
      if (item.type !== 'lesson') continue;
      if (item.options === options) return 'duplicate';
      if (item.date === date && item.time === time) return 'conflict';
    }

    this.save([...items, { name, price, quantity: 1, options, type: 'lesson', date, time }]);
    return 'added';
  }

  // Add or subtract from an item's quantity (going below 1 removes it)
  changeQuantity(index: number, change: number): void {
    const items = this.items().map((item) => ({ ...item }));
    items[index].quantity += change;
    if (items[index].quantity < 1) items.splice(index, 1);
    this.save(items);
  }

  remove(index: number): void {
    this.save(this.items().filter((_, i) => i !== index));
  }

  clear(): void {
    this.save([]);
  }

  // Take lessons out of the cart if their time has passed, and tell the customer
  removeExpiredLessons(): void {
    const keep: CartItem[] = [];
    const removed: { item: CartItem; reason: string }[] = [];

    for (const item of this.items()) {
      const reason = item.type === 'lesson' ? lessonProblem(item.date, item.time) : '';
      if (reason) removed.push({ item, reason });
      else keep.push(item);
    }

    if (removed.length === 0) return;

    this.save(keep);
    const details = removed.map((entry) => entry.item.options + ' (' + entry.reason + ')').join('; ');
    const noun = removed.length === 1 ? 'lesson' : 'lessons';
    this.toast.show('We removed ' + removed.length + ' ' + noun + ' from your cart: ' + details + '.', {
      type: 'warning',
      duration: 0
    });
  }

  // ---------- Slide-in cart panel ----------

  open(returnFocusTo?: HTMLElement | null): void {
    // (a click passes an event here, so only accept a real element)
    this.returnFocusTo = returnFocusTo instanceof HTMLElement ? returnFocusTo : (document.activeElement as HTMLElement | null);
    this.removeExpiredLessons();
    this.isOpen.set(true);
  }

  close(): void {
    const wasOpen = this.isOpen();
    this.isOpen.set(false);

    if (wasOpen && this.returnFocusTo && document.contains(this.returnFocusTo)) {
      this.returnFocusTo.focus();
    }

    // If focus could not go back, don't leave it on a button inside the closed panel
    const drawer = document.getElementById('cartDrawer');
    const active = document.activeElement as HTMLElement | null;
    if (drawer && active && drawer.contains(active)) active.blur();
  }
}
