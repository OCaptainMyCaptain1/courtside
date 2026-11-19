import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { NewReview, Review } from './review';

@Service()
export class ReviewService {
  private http = inject(HttpClient);

  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>('/api/reviews');
  }

  // The server checks the review again and saves it in MongoDB
  addReview(review: NewReview): Observable<Review> {
    return this.http.post<Review>('/api/reviews', review);
  }
}
