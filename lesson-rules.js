// The rules for booking a private lesson, enforced by the server.
// (The Angular lesson page enforces the same rules so customers get quick feedback,
// but the server is the one that decides.)

const LESSON_NAME = 'Private Lesson (60 min)';

// Keep in sync with MAX_BOOKING_MONTHS in client/src/app/lesson-dates.ts
const MAX_BOOKING_MONTHS = 6;

// The times a lesson can start. The lesson page draws its buttons from this list.
const TIME_GROUPS = [
  { label: 'Morning', times: ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'] },
  { label: 'Afternoon', times: ['1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'] },
  { label: 'Evening', times: ['6:00 PM', '7:00 PM', '8:00 PM'] }
];

const ALL_TIMES = TIME_GROUPS.flatMap(function (group) { return group.times; });

// A Date as YYYY-MM-DD
function dateToString(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function todayString() {
  return dateToString(new Date());
}

function maxDateString() {
  const limit = new Date();
  limit.setMonth(limit.getMonth() + MAX_BOOKING_MONTHS);
  return dateToString(limit);
}

// YYYY-MM-DD strings sort correctly as plain text
function isRealDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dateToString(date) === text;
}

// "9:00 AM" -> minutes since midnight
function lessonMinutes(timeText) {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(timeText);
  return ((Number(match[1]) % 12) + (match[3] === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
}

// "2026-12-05" -> "Sat, Dec 5, 2026"
function formatLessonDate(dateString) {
  const parts = dateString.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Why this date and time cannot be booked, or "" if it is fine
function checkLessonSlot(date, time) {
  if (!isRealDate(date)) return 'that is not a valid date';
  if (!ALL_TIMES.includes(time)) return 'that is not a lesson time';

  if (date < todayString()) return 'that date has passed';
  if (date > maxDateString()) return 'that date is more than ' + MAX_BOOKING_MONTHS + ' months away';

  if (date === todayString()) {
    const now = new Date();
    if (lessonMinutes(time) <= now.getHours() * 60 + now.getMinutes()) return 'that time has passed';
  }
  return '';
}

module.exports = {
  LESSON_NAME, MAX_BOOKING_MONTHS, TIME_GROUPS, ALL_TIMES,
  todayString, maxDateString, isRealDate, formatLessonDate, checkLessonSlot
};
