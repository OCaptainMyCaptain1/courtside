import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { calculateTax, CartService } from '../cart-service';
import { LessonInfo } from '../lesson';
import {
  compareDateStrings, formatLessonDate, hasLessonTimePassed, MAX_BOOKING_MONTHS, maxDateString, todayString
} from '../lesson-dates';
import { LessonService } from '../lesson-service';
import { ToastService } from '../toast-service';

// The "Book a Lesson" page. Coaches and the list of times come from the server (MongoDB),
// and the times a coach has already booked are checked live when a coach and date are chosen.
@Component({
  imports: [CurrencyPipe],
  selector: 'app-lessons',
  styleUrl: './lessons.css',
  templateUrl: './lessons.html',
})
export class Lessons {
  private lessonService = inject(LessonService);
  private toast = inject(ToastService);
  protected cart = inject(CartService);

  protected info = signal<LessonInfo | null>(null);
  protected loadError = signal('');

  // What the customer has chosen
  protected coach = signal('');
  protected date = signal('');
  protected time = signal('');

  // Times this coach already has booked on the chosen date (from the database)
  protected bookedTimes = signal<string[]>([]);

  // Messages
  protected coachError = signal('');
  protected dateError = signal('');
  protected timeError = signal('');
  protected bookingMessage = signal('');
  protected showViewCart = signal(false);

  protected minDate = todayString();
  protected maxDate = maxDateString();
  protected dateHint = 'Lessons can be booked up to ' + MAX_BOOKING_MONTHS + ' months ahead.';

  private latestCheck = '';   // used to ignore availability answers that arrive late

  protected allTimes = computed(() => (this.info()?.timeGroups ?? []).flatMap((group) => group.times));

  // Lesson price plus tax, for the "Estimated total" line
  protected estimate = computed(() => {
    const price = this.info()?.price ?? 0;
    return Math.round((price + calculateTax(price)) * 100) / 100;
  });

  protected timeHint = computed(() => {
    const times = this.allTimes();
    if (times.length === 0) return '';

    const passed = times.filter((time) => this.hasPassed(time));
    const booked = times.filter((time) => !this.hasPassed(time) && this.bookedTimes().includes(time));
    const open = times.filter((time) => !this.isUnavailable(time));

    if (this.date() && open.length === 0) {
      return booked.length > 0
        ? this.coach() + ' has no open times on that date. Please choose another date or coach.'
        : 'No lesson times are left today. Please choose another date.';
    }

    const notes: string[] = [];
    if (passed.length > 0) notes.push('Times that have already passed today are unavailable.');
    if (booked.length > 0) notes.push('Greyed-out times are already booked with ' + this.coach() + '.');
    return notes.join(' ');
  });

  constructor() {
    this.lessonService.getLessonInfo().subscribe({
      next: (info) => this.info.set(info),
      error: () => this.loadError.set("Sorry, we couldn't load lesson information. Please refresh the page.")
    });
  }

  // "Coach 1" -> "C1", "Maria Lopez" -> "ML" (the circle on each coach card)
  protected avatar(name: string): string {
    return name.split(' ').map((word) => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  }

  // ---------- Which times can be chosen ----------

  private hasPassed(time: string): boolean {
    return this.date() === todayString() && hasLessonTimePassed(this.date(), time);
  }

  protected isUnavailable(time: string): boolean {
    return this.hasPassed(time) || this.bookedTimes().includes(time);
  }

  // Returns an error message for a bad date, or "" if the date is fine
  private checkDate(value: string): string {
    if (!value) return 'Please choose a complete date.';
    if (compareDateStrings(value, todayString()) < 0) return 'Please choose today or a future date.';
    if (compareDateStrings(value, maxDateString()) > 0) {
      return 'Lessons can be booked up to ' + MAX_BOOKING_MONTHS + ' months ahead (through ' + formatLessonDate(maxDateString()) + ').';
    }
    return '';
  }

  // Ask the server which times this coach already has booked on this date
  private refreshAvailability(): void {
    this.bookedTimes.set([]);
    this.dropUnavailableTime();

    const coach = this.coach();
    const date = this.date();
    if (!coach || this.checkDate(date)) return;

    const key = coach + '|' + date;
    this.latestCheck = key;

    this.lessonService.getAvailability(coach, date).subscribe({
      next: (result) => {
        if (this.latestCheck !== key) return;   // the customer already picked something else
        this.bookedTimes.set(result.bookedTimes);
        this.dropUnavailableTime();
      }
      // If this check fails, the server still refuses a double booking when the order is placed
    });
  }

  // If the chosen time is no longer available, unselect it
  private dropUnavailableTime(): void {
    if (this.time() && this.isUnavailable(this.time())) this.time.set('');
  }

  // ---------- Customer choices ----------

  protected chooseCoach(name: string): void {
    this.coach.set(name);
    this.coachError.set('');
    this.bookingMessage.set('');
    this.refreshAvailability();
  }

  protected onDateInput(event: Event): void {
    this.date.set((event.target as HTMLInputElement).value);
    this.dateError.set('');
    this.bookingMessage.set('');
    this.refreshAvailability();
  }

  protected chooseTime(time: string): void {
    this.time.set(time);
    this.timeError.set('');
    this.bookingMessage.set('');
  }

  protected openCart(event: Event): void {
    this.cart.open(event.currentTarget as HTMLElement);
  }

  // ---------- Add to Cart ----------

  protected addToCart(): void {
    const info = this.info();
    if (!info) return;

    this.bookingMessage.set('');
    this.coachError.set('');
    this.dateError.set('');
    this.timeError.set('');

    // Check everything, show every problem, then move to the first one (in page order)
    let firstProblem: HTMLElement | null = null;

    if (!this.coach()) {
      this.coachError.set('Choose a coach for your lesson.');
      firstProblem = document.getElementById('coach-0');
    }

    const dateProblem = this.checkDate(this.date());
    if (dateProblem) {
      this.dateError.set(dateProblem);
      firstProblem ??= document.getElementById('dateInput');
    }

    if (!this.time()) {
      this.timeError.set('Choose a time for your lesson.');
      firstProblem ??= document.querySelector<HTMLElement>('input[name="lessonTime"]:not(:disabled)');
    } else if (!dateProblem && hasLessonTimePassed(this.date(), this.time())) {
      this.timeError.set('That time has already passed. Please choose a later time.');
      firstProblem ??= document.querySelector<HTMLElement>('input[name="lessonTime"]:checked');
    }

    if (firstProblem) {
      firstProblem.focus();
      return;
    }

    const coach = this.coach();
    const date = this.date();
    const time = this.time();
    const options = coach + ', ' + formatLessonDate(date) + ', ' + time;

    const result = this.cart.addLesson(info.name, info.price, options, coach, date, time);

    if (result === 'duplicate') {
      this.bookingMessage.set('That lesson is already in your cart.');
      this.showViewCart.set(true);
    } else if (result === 'conflict') {
      this.bookingMessage.set('You already have a lesson in your cart at that date and time. Choose a different time.');
      this.showViewCart.set(true);
    } else {
      this.toast.show('Lesson with ' + coach + ' (' + formatLessonDate(date) + ', ' + time + ') added to your cart.', {
        actionLabel: 'View cart',
        onAction: (opener) => this.cart.open(opener)
      });
    }
  }
}
