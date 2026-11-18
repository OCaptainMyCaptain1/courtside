import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Availability, LessonInfo } from './lesson';

@Service()
export class LessonService {
  private http = inject(HttpClient);

  // Price, coaches, and bookable times (coaches come from MongoDB)
  getLessonInfo(): Observable<LessonInfo> {
    return this.http.get<LessonInfo>('/api/lessons');
  }

  // Which times this coach already has booked on this day
  getAvailability(coach: string, date: string): Observable<Availability> {
    return this.http.get<Availability>('/api/lessons/availability', { params: { coach, date } });
  }
}
