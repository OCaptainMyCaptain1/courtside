import { CurrencyPipe } from '@angular/common';
import { afterNextRender, Component, effect, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth-service';
import { CartService, TAX_PERCENT_TEXT } from '../cart-service';
import { OrderResult } from '../order';
import { OrderService } from '../order-service';
import { productInitials } from '../product-utils';

const TEST_CARD = '4242424242424242';

// ---------- Validators ----------
// Each one returns null when the value is fine, or { problem: "message" } when it is not.

function problem(message: string): ValidationErrors {
  return { problem: message };
}

const nameValidator: ValidatorFn = (control: AbstractControl) =>
  String(control.value).trim().length < 2 ? problem('Enter your full name.') : null;

const emailValidator: ValidatorFn = (control: AbstractControl) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(control.value).trim())
    ? null
    : problem('Enter a valid email, like name@example.com.');

const cardNumberValidator: ValidatorFn = (control: AbstractControl) => {
  const digits = String(control.value).replace(/\s/g, '');
  if (digits === '') return problem('Click "Fill in test card" below. Do not enter a real card.');
  return digits === TEST_CARD ? null : problem('This prototype only accepts the test card. Click "Fill in test card" instead.');
};

const expiryValidator: ValidatorFn = (control: AbstractControl) => {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(control.value));
  if (!match) return problem('Enter the expiry date as MM/YY.');

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
  return expired ? problem('This card has expired.') : null;
};

const cvcValidator: ValidatorFn = (control: AbstractControl) =>
  /^\d{3}$/.test(String(control.value)) ? null : problem('Enter the 3-digit security code.');

// ---------- The checkout page ----------

type FieldName = 'name' | 'email' | 'courtNumber' | 'cardNumber' | 'cardExpiry' | 'cardCvc';

// The fields in page order, and the element id each one has (used by the error summary links)
const FIELDS: { name: FieldName; id: string }[] = [
  { name: 'name', id: 'checkoutName' },
  { name: 'email', id: 'checkoutEmail' },
  { name: 'courtNumber', id: 'courtNumber' },
  { name: 'cardNumber', id: 'cardNumber' },
  { name: 'cardExpiry', id: 'cardExpiry' },
  { name: 'cardCvc', id: 'cardCvc' }
];

interface Confirmation {
  firstName: string;
  orderNumber: string;
  lessons: string[];
  fulfillmentText: string;
  subtotal: number;
  tax: number;
  total: number;
}

@Component({
  imports: [ReactiveFormsModule, CurrencyPipe, RouterLink],
  selector: 'app-checkout',
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class Checkout {
  protected cart = inject(CartService);
  protected auth = inject(AuthService);
  private orders = inject(OrderService);
  private injector = inject(Injector);

  protected taxText = TAX_PERCENT_TEXT;
  protected initials = productInitials;

  // Court number is only required when the customer chose delivery (and has something to deliver)
  private courtNumberValidator: ValidatorFn = (control: AbstractControl) => {
    const wantsDelivery = control.parent?.get('fulfillment')?.value === 'court' && this.cart.hasPhysicalItems();
    return wantsDelivery && String(control.value).trim() === ''
      ? problem('Enter your court number so we know where to deliver your order.')
      : null;
  };

  // The form: one FormControl per input, grouped together
  protected form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [nameValidator] }),
    email: new FormControl('', { nonNullable: true, validators: [emailValidator] }),
    fulfillment: new FormControl<'pickup' | 'court'>('pickup', { nonNullable: true }),
    courtNumber: new FormControl('', { nonNullable: true, validators: [this.courtNumberValidator] }),
    cardNumber: new FormControl('', { nonNullable: true, validators: [cardNumberValidator] }),
    cardExpiry: new FormControl('', { nonNullable: true, validators: [expiryValidator] }),
    cardCvc: new FormControl('', { nonNullable: true, validators: [cvcValidator] })
  });

  // Signals that follow the form, so the page redraws when the form changes
  protected formEvent = toSignal(this.form.events);
  protected fulfillment = toSignal(this.form.controls.fulfillment.valueChanges, { initialValue: 'pickup' as const });

  protected submitted = signal(false);
  protected placing = signal(false);
  protected quietErrors = signal(false);
  protected summary = signal<{ id: string; message: string }[]>([]);
  protected confirmation = signal<Confirmation | null>(null);

  private errorSummaryBox = viewChild<ElementRef<HTMLElement>>('errorSummaryBox');
  private confirmTitle = viewChild<ElementRef<HTMLElement>>('confirmTitle');

  constructor() {
    // A signed-in customer doesn't have to retype their details (they can still change them)
    const signedIn = this.auth.user();
    if (signedIn) this.form.patchValue({ name: signedIn.name, email: signedIn.email });

    // When the cart changes (for example a lesson-only order), keep the delivery choice and its validation in step
    effect(() => {
      const needsFulfillment = this.cart.hasPhysicalItems();
      if (!needsFulfillment) this.form.controls.fulfillment.setValue('pickup');
      this.form.controls.courtNumber.updateValueAndValidity();
    });

    this.form.controls.fulfillment.valueChanges.subscribe(() => {
      this.form.controls.courtNumber.updateValueAndValidity();
    });
  }

  // The message to show under a field (only after it was visited, or after Place order was clicked)
  protected errorFor(field: FieldName): string {
    this.formEvent(); // makes the page re-check this whenever the form changes
    const control = this.form.controls[field];
    if (!control.touched && !this.submitted()) return '';
    return control.errors?.['problem'] ?? '';
  }

  // ---------- Auto-formatting while typing ----------

  protected formatCardNumber(): void {
    const control = this.form.controls.cardNumber;
    const digits = control.value.replace(/\D/g, '').slice(0, 16);
    control.setValue(digits.replace(/(.{4})/g, '$1 ').trim());
  }

  protected formatExpiry(): void {
    const control = this.form.controls.cardExpiry;
    const digits = control.value.replace(/\D/g, '').slice(0, 4);
    control.setValue(digits.length >= 3 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits);
  }

  protected formatCvc(): void {
    const control = this.form.controls.cardCvc;
    control.setValue(control.value.replace(/\D/g, '').slice(0, 3));
  }

  protected fillTestCard(): void {
    this.form.patchValue({ cardNumber: '4242 4242 4242 4242', cardExpiry: '12/30', cardCvc: '123' });
    ['cardNumber', 'cardExpiry', 'cardCvc'].forEach((name) => {
      this.form.get(name)?.markAsUntouched();
    });
  }

  // ---------- Error summary (a box at the top of the form listing every problem) ----------

  private showSummary(errors: { id: string; message: string }[]): void {
    this.summary.set(errors);
    afterNextRender(() => this.errorSummaryBox()?.nativeElement.focus(), { injector: this.injector });
  }

  protected goToField(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.focus();
  }

  // ---------- Place order ----------

  protected submit(): void {
    // A lesson saved earlier may have started while this page was open
    const before = this.cart.items().length;
    this.cart.removeExpiredLessons();
    if (this.cart.items().length !== before) return;

    this.submitted.set(true);
    this.form.markAllAsTouched();

    const errors = FIELDS
      .map((field) => ({ id: field.id, message: this.form.controls[field.name].errors?.['problem'] as string | undefined }))
      .filter((entry): entry is { id: string; message: string } => !!entry.message);

    if (errors.length > 0) {
      // The summary announces everything at once, so keep the field messages quiet this one time
      this.quietErrors.set(true);
      setTimeout(() => this.quietErrors.set(false), 300);
      this.showSummary(errors);
      return;
    }

    this.summary.set([]);
    this.sendOrder();
  }

  private sendOrder(): void {
    const value = this.form.getRawValue();
    const items = this.cart.items();
    const hasPhysical = this.cart.hasPhysicalItems();
    const fulfillment = hasPhysical ? value.fulfillment : 'none';
    const court = value.courtNumber.trim();

    this.placing.set(true);

    this.orders.placeOrder({
      customerName: value.name.trim(),
      email: value.email.trim(),
      fulfillment: fulfillment,
      courtNumber: fulfillment === 'court' ? court : '',
      // Only names, options, and quantities are sent. The server decides the prices.
      items: items.map((item) => ({
        name: item.name,
        options: item.options,
        quantity: item.quantity,
        type: item.type,
        coach: item.coach,
        date: item.date,
        time: item.time
      }))
    }).subscribe({
      next: (result) => this.finishOrder(result, value.name.trim(), fulfillment, court),
      error: (error) => {
        this.placing.set(false);
        const message = error?.error?.error ?? "We couldn't save your order. Please try again.";
        this.showSummary([{ id: 'placeOrderBtn', message }]);
      }
    });
  }

  private finishOrder(result: OrderResult, fullName: string, fulfillment: string, court: string): void {
    let fulfillmentText = '';
    if (fulfillment === 'court') fulfillmentText = "We'll deliver your order to court " + court + '.';
    else if (fulfillment === 'pickup') fulfillmentText = 'Pick up your order at the CourtSide front desk.';

    this.confirmation.set({
      firstName: fullName.split(' ')[0],
      orderNumber: result.orderNumber,
      lessons: this.cart.items().filter((item) => item.type === 'lesson').map((item) => item.options),
      fulfillmentText: fulfillmentText,
      // These come from the SERVER's calculation, not the browser's
      subtotal: result.subtotal,
      tax: result.tax,
      total: result.total
    });

    // Wipe everything: the form (including the card boxes) and the cart
    this.form.reset();
    this.submitted.set(false);
    this.summary.set([]);
    this.cart.clear();
    this.placing.set(false);

    window.scrollTo(0, 0);
    // Move keyboard and screen reader focus to the confirmation, since the form it was on is gone
    afterNextRender(() => this.confirmTitle()?.nativeElement.focus(), { injector: this.injector });
  }
}
