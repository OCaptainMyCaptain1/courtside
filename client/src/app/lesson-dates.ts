// Lesson date helpers (shared by the lesson page, the cart, and checkout)

// How far ahead a lesson can be booked. Change this one number to adjust the window.
export const MAX_BOOKING_MONTHS = 6;

// Turn a Date into YYYY-MM-DD in the customer's own time zone
export function dateToString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function todayString(): string {
  return dateToString(new Date());
}

// The last bookable day: today plus MAX_BOOKING_MONTHS
export function maxDateString(): string {
  const limit = new Date();
  limit.setMonth(limit.getMonth() + MAX_BOOKING_MONTHS);
  return dateToString(limit);
}

// Compare two YYYY-MM-DD strings as numbers. Returns negative, zero, or positive.
export function compareDateStrings(a: string, b: string): number {
  const aParts = a.split('-').map(Number);
  const bParts = b.split('-').map(Number);
  for (let i = 0; i < 3; i++) {
    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
  }
  return 0;
}

// "9:00 AM" -> minutes since midnight (540). Returns NaN if the text is not a time like that.
export function lessonMinutes(timeText: string): number {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(timeText || '');
  if (!match) return NaN;
  return ((Number(match[1]) % 12) + (match[3] === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
}

// True if a lesson on this date at this time has already started
export function hasLessonTimePassed(dateString: string, timeText: string): boolean {
  const comparison = compareDateStrings(dateString, todayString());
  if (comparison < 0) return true;
  if (comparison > 0) return false;
  const now = new Date();
  return lessonMinutes(timeText) <= now.getHours() * 60 + now.getMinutes();
}

// Why a lesson can no longer be booked ("" if it is still fine)
export function lessonProblem(date?: string, time?: string): string {
  if (!date || !time) return '';
  if (compareDateStrings(date, maxDateString()) > 0) {
    return 'it is more than ' + MAX_BOOKING_MONTHS + ' months away';
  }
  if (hasLessonTimePassed(date, time)) return 'that time has passed';
  return '';
}
