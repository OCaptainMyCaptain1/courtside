import { Component, computed, inject, Injector, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { Review } from '../review';
import { ReviewService } from '../review-service';
import { ToastService } from '../toast-service';

const MAX_COMMENT_LENGTH = 300;

// The Reviews page: reviews are read from MongoDB, and new ones are saved there
@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-reviews',
  styleUrl: './reviews.css',
  templateUrl: './reviews.html',
})
export class Reviews {
  private reviewService = inject(ReviewService);
  private toast = inject(ToastService);

  protected reviews = signal<Review[]>([]);
  protected loading = signal(true);
  protected loadError = signal('');

  protected form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    rating: new FormControl<number | null>(null),
    comment: new FormControl('', { nonNullable: true })
  });

  protected maxLength = MAX_COMMENT_LENGTH;
  protected commentLength = toSignal(this.form.controls.comment.valueChanges.pipe(map((text) => text.length)), { initialValue: 0 });

  protected message = signal('');
  protected saving = signal(false);

  // "Average rating: 4.5 out of 5 from 2 reviews"
  protected average = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return 0;
    return Math.round((list.reduce((sum, review) => sum + review.rating, 0) / list.length) * 10) / 10;
  });

  constructor() {
    this.reviewService.getReviews().subscribe({
      next: (list) => {
        this.reviews.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set("Sorry, we couldn't load the reviews. Please refresh the page.");
        this.loading.set(false);
      }
    });
  }

  protected submit(): void {
    const value = this.form.getRawValue();
    const name = value.name.trim();
    const rating = Number(value.rating);
    const comment = value.comment.trim();

    // Say exactly what is wrong, and move keyboard focus to that field
    let problem = '';
    let fieldId = '';

    if (name === '') {
      problem = 'Please enter your name.';
      fieldId = 'nameInput';
    } else if (value.rating === null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      problem = 'Please enter a rating from 1 to 5.';
      fieldId = 'ratingInput';
    } else if (comment === '') {
      problem = 'Please write a comment.';
      fieldId = 'commentInput';
    }

    if (problem) {
      this.message.set(problem);
      document.getElementById(fieldId)?.focus();
      return;
    }

    this.message.set('');
    this.saving.set(true);

    this.reviewService.addReview({ name, rating, comment }).subscribe({
      next: (review) => {
        this.reviews.update((list) => [...list, review]);
        this.form.reset();
        this.saving.set(false);

        // The new review is added above the form, so offer a way to jump to it
        this.toast.show('Thanks for your review! It was added to the list above.', {
          actionLabel: 'View review',
          onAction: () => {
            const element = document.getElementById('review-' + review._id);
            element?.scrollIntoView({ block: 'center' });
            element?.focus();
          }
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.message.set(error?.error?.error ?? "We couldn't save your review. Please try again.");
      }
    });
  }
}
