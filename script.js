const LESSON_NAME = "Private Lesson (60 min)";
const LESSON_PRICE = 45.00;

// Turn "2026-10-17" into "Sat, Oct 17, 2026" (built from the parts so time zones can't shift the day)
function formatLessonDate(dateString) {
  const parts = dateString.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// ---------- Notices under the Add to Cart button ----------

// For "already in your cart" style notices (optionally followed by a "View cart" button)
function showBookingMessage(text, showCartButton) {
  const message = document.getElementById("bookingMessage");
  message.textContent = text;

  if (showCartButton) {
    message.append(" ");
    const viewCart = document.createElement("button");
    viewCart.type = "button";
    viewCart.className = "inline-link-btn";
    viewCart.textContent = "View cart";
    viewCart.addEventListener("click", openCart);
    message.appendChild(viewCart);
  }
}

// ---------- Errors shown right next to the field that has the problem ----------

function showFieldError(errorId, message, fieldId) {
  document.getElementById(errorId).textContent = message;
  const field = document.getElementById(fieldId);
  field.classList.add("has-error");
  if (field.tagName === "INPUT") field.setAttribute("aria-invalid", "true");
}

function clearFieldError(errorId, fieldId) {
  document.getElementById(errorId).textContent = "";
  const field = document.getElementById(fieldId);
  field.classList.remove("has-error");
  if (field.tagName === "INPUT") field.removeAttribute("aria-invalid");
}

// Returns an error message for a bad date, or "" if the date is fine
function checkLessonDate(value) {
  if (!value) return "Please choose a complete date.";
  if (compareDateStrings(value, todayString()) < 0) return "Please choose today or a future date.";
  if (compareDateStrings(value, maxDateString()) > 0) {
    return "Lessons can be booked up to " + MAX_BOOKING_MONTHS + " months ahead (through " + formatLessonDate(maxDateString()) + ").";
  }
  return "";
}

const dateInput = document.getElementById("dateInput");
const timeRadios = document.querySelectorAll('input[name="lessonTime"]');

// Set the allowed range on the date box and explain it underneath
if (dateInput) {
  dateInput.min = todayString();
  dateInput.max = maxDateString();
  const hint = document.getElementById("dateHint");
  if (hint) hint.textContent = "Lessons can be booked up to " + MAX_BOOKING_MONTHS + " months ahead.";
}

// If today is the chosen date, switch off times that have already passed
function updateTimeAvailability() {
  if (!dateInput || timeRadios.length === 0) return;

  const isToday = dateInput.value === todayString();
  let disabledCount = 0;

  timeRadios.forEach(function (radio) {
    const passed = isToday && hasLessonTimePassed(dateInput.value, radio.value);
    radio.disabled = passed;
    if (passed) {
      disabledCount++;
      radio.checked = false;
    }
  });

  const timeHint = document.getElementById("timeHint");
  if (disabledCount === timeRadios.length) {
    timeHint.textContent = "No lesson times are left today. Please choose another date.";
  } else if (disabledCount > 0) {
    timeHint.textContent = "Times that have already passed today are unavailable.";
  } else {
    timeHint.textContent = "";
  }
}

// Show the lesson total next to the Add to Cart button
const lessonTotal = document.getElementById("lessonTotal");
if (lessonTotal) {
  const lessonWithTax = LESSON_PRICE + calculateTax(LESSON_PRICE);
  lessonTotal.textContent = "Estimated total: $" + lessonWithTax.toFixed(2) + " (60-minute lesson, includes tax)";
}

const bookBtn = document.getElementById("bookBtn");
if (bookBtn) {
  // An error disappears as soon as the customer fixes that field
  document.querySelectorAll('input[name="coach"]').forEach(function (radio) {
    radio.addEventListener("change", function () { clearFieldError("coachError", "coachGroup"); });
  });
  timeRadios.forEach(function (radio) {
    radio.addEventListener("change", function () { clearFieldError("timeError", "timeGroup"); });
  });
  ["input", "change"].forEach(function (eventName) {
    dateInput.addEventListener(eventName, function () {
      clearFieldError("dateError", "dateInput");
      updateTimeAvailability();
    });
  });
  document.querySelector(".lesson-offer").addEventListener("change", function () {
    document.getElementById("bookingMessage").textContent = "";
  });

  updateTimeAvailability();

  bookBtn.addEventListener("click", function () {
    const coachChoice = document.querySelector('input[name="coach"]:checked');
    const timeChoice = document.querySelector('input[name="lessonTime"]:checked');

    document.getElementById("bookingMessage").textContent = "";
    clearFieldError("coachError", "coachGroup");
    clearFieldError("dateError", "dateInput");
    clearFieldError("timeError", "timeGroup");

    // Check everything, show every problem, then move to the first one (in page order)
    let firstProblemField = null;

    if (!coachChoice) {
      showFieldError("coachError", "Choose a coach for your lesson.", "coachGroup");
      firstProblemField = document.querySelector('input[name="coach"]');
    }

    const dateError = checkLessonDate(dateInput.value);
    if (dateError) {
      showFieldError("dateError", dateError, "dateInput");
      if (!firstProblemField) firstProblemField = dateInput;
    }

    if (!timeChoice) {
      showFieldError("timeError", "Choose a time for your lesson.", "timeGroup");
      if (!firstProblemField) firstProblemField = document.querySelector('input[name="lessonTime"]:not(:disabled)');
    } else if (!dateError && hasLessonTimePassed(dateInput.value, timeChoice.value)) {
      showFieldError("timeError", "That time has already passed. Please choose a later time.", "timeGroup");
      if (!firstProblemField) firstProblemField = timeChoice;
    }

    if (firstProblemField) {
      firstProblemField.focus();
      return;
    }

    const selectedCoach = coachChoice.value;
    const selectedDate = dateInput.value;
    const selectedTime = timeChoice.value;

    const options = selectedCoach + ", " + formatLessonDate(selectedDate) + ", " + selectedTime;
    const result = addLessonToCart(LESSON_NAME, LESSON_PRICE, options, selectedDate, selectedTime);

    if (result === "duplicate") {
      showBookingMessage("That lesson is already in your cart.", true);
    } else if (result === "conflict") {
      showBookingMessage("You already have a lesson in your cart at that date and time. Choose a different time.", true);
    } else {
      showToast("Lesson with " + selectedCoach + " (" + formatLessonDate(selectedDate) + ", " + selectedTime + ") added to your cart.", {
        actionLabel: "View cart",
        onAction: openCart
      });
    }
  });
}

// ---------- Reviews ----------

// Adds a new review to the page (built with textContent so typed text is never treated as HTML)
function addReview(name, rating, comment) {
  const reviewList = document.getElementById("reviewList");

  const newReview = document.createElement("article");
  newReview.className = "review";
  newReview.setAttribute("tabindex", "-1");

  const reviewer = document.createElement("p");
  reviewer.className = "reviewer";
  reviewer.textContent = name;

  const ratingLine = document.createElement("p");
  ratingLine.className = "rating";
  ratingLine.textContent = `Rating: ${rating}/5`;

  const text = document.createElement("p");
  text.textContent = comment;

  newReview.append(reviewer, ratingLine, text);
  reviewList.appendChild(newReview);
  return newReview;
}

// Live character counter for the comment box (input event)
const commentInput = document.getElementById("commentInput");
const charCount = document.getElementById("charCount");

function updateCharCount() {
  charCount.textContent = `${commentInput.value.length} / ${commentInput.maxLength}`;
}

if (commentInput && charCount) {
  commentInput.addEventListener("input", updateCharCount);
}

const feedbackForm = document.getElementById("feedbackForm");
if (feedbackForm) {
  feedbackForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const nameInput = document.getElementById("nameInput");
    const ratingInput = document.getElementById("ratingInput");
    const message = document.getElementById("feedbackMessage");

    const name = nameInput.value.trim();
    const rating = Number(ratingInput.value);
    const comment = commentInput.value.trim();

    // Guard against whitespace-only entries and ratings outside 1-5, and say exactly what is wrong
    let problem = "";
    let problemField = null;

    if (name === "") {
      problem = "Please enter your name.";
      problemField = nameInput;
    } else if (!(rating >= 1 && rating <= 5)) {
      problem = "Please enter a rating from 1 to 5.";
      problemField = ratingInput;
    } else if (comment === "") {
      problem = "Please write a comment.";
      problemField = commentInput;
    }

    if (problem) {
      message.textContent = problem;
      problemField.focus();
      return;
    }

    message.textContent = "";
    const review = addReview(name, rating, comment);

    feedbackForm.reset();
    updateCharCount();

    // The new review is added above the form, so offer a way to jump to it
    showToast("Thanks for your review! It was added to the list above.", {
      actionLabel: "View review",
      onAction: function () {
        review.scrollIntoView({ block: "center" });
        review.focus();
      }
    });
  });
}
