const LESSON_NAME = "Private Lesson (60 min)";
const LESSON_PRICE = 45.00;

// Turn "2026-10-17" into "Sat, Oct 17, 2026" (built from the parts so time zones can't shift the day)
function formatLessonDate(dateString) {
  const parts = dateString.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// Shows a message under the Add Lesson button (optionally followed by a "View cart" button)
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

// Today's date in the customer's own time zone, as YYYY-MM-DD
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Prevent selecting a date before today
const dateInputForMin = document.getElementById("dateInput");
if (dateInputForMin) {
  dateInputForMin.min = todayString();
}

const bookBtn = document.getElementById("bookBtn");
if (bookBtn) {
  bookBtn.addEventListener("click", function () {
    const selectedCoach = document.getElementById("coachSelect").value;
    const selectedDate = document.getElementById("dateInput").value;
    const selectedTime = document.getElementById("timeSelect").value;

    if (!selectedDate) {
      showBookingMessage("Please choose a date before adding your lesson.", false);
      document.getElementById("dateInput").focus();
      return;
    }

    if (selectedDate < todayString()) {
      showBookingMessage("Please choose today or a future date.", false);
      return;
    }

    const options = selectedCoach + ", " + formatLessonDate(selectedDate) + ", " + selectedTime;
    const result = addLessonToCart(LESSON_NAME, LESSON_PRICE, options, selectedDate, selectedTime);

    if (result === "duplicate") {
      showBookingMessage("That lesson is already in your cart.", true);
    } else if (result === "conflict") {
      showBookingMessage("You already have a lesson in your cart at that date and time. Choose a different time.", true);
    } else {
      showBookingMessage("Lesson with " + selectedCoach + " added to your cart.", true);
    }
  });
}

// Adds a new review to the page (built with textContent so typed text is never treated as HTML)
function addReview(name, rating, comment) {
  const reviewList = document.getElementById("reviewList");

  const newReview = document.createElement("article");
  newReview.className = "review";

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

    const name = document.getElementById("nameInput").value.trim();
    const rating = Number(document.getElementById("ratingInput").value);
    const comment = commentInput.value.trim();

    // Guard against whitespace-only entries and ratings outside 1-5
    if (name === "" || comment === "" || rating < 1 || rating > 5) {
      document.getElementById("feedbackMessage").textContent =
        "Please enter your name, a rating from 1 to 5, and a comment.";
      return;
    }

    addReview(name, rating, comment);

    feedbackForm.reset();
    updateCharCount();
    document.getElementById("feedbackMessage").textContent = "Thanks for your feedback! Your review was added above.";
  });
}
