// Shows the booking confirmation
function confirmBooking(coachName, date, time) {
  const message = document.getElementById("bookingMessage");
  message.innerHTML = `You're booked with ${coachName} on ${date} at ${time}. See you on the court!`;
}

// Prevent selecting a date before today
const dateInputForMin = document.getElementById("dateInput");
if (dateInputForMin) {
  const today = new Date().toISOString().split("T")[0];
  dateInputForMin.min = today;
}

const bookBtn = document.getElementById("bookBtn");
if (bookBtn) {
  bookBtn.addEventListener("click", function () {
    const selectedCoach = document.getElementById("coachSelect").value;
    const selectedDate = document.getElementById("dateInput").value;
    const selectedTime = document.getElementById("timeSelect").value;

    if (!selectedDate) {
      alert("Please select a date before booking.");
      return;
    }

    confirmBooking(selectedCoach, selectedDate, selectedTime);
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
