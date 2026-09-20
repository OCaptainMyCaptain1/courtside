// Runs when the "Book This Lesson" button is clicked
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
    const coachSelect = document.getElementById("coachSelect");
    const dateInput = document.getElementById("dateInput");
    const timeSelect = document.getElementById("timeSelect");

    const selectedCoach = coachSelect.value;
    const selectedDate = dateInput.value;
    const selectedTime = timeSelect.value;

    if (!selectedDate) {
      alert("Please select a date before booking.");
      return;
    }

    confirmBooking(selectedCoach, selectedDate, selectedTime);
  });
}

// Runs when the feedback form is submitted
function addReview(name, rating, comment) {
  const reviewList = document.getElementById("reviewList");

  const newReview = document.createElement("article");
  newReview.className = "review";
  newReview.innerHTML = `
    <p class="reviewer">${name}</p>
    <p class="rating">Rating: ${rating}/5</p>
    <p>${comment}</p>
  `;

  reviewList.appendChild(newReview);
}

const feedbackForm = document.getElementById("feedbackForm");
if (feedbackForm) {
  feedbackForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("nameInput").value;
    const rating = document.getElementById("ratingInput").value;
    const comment = document.getElementById("commentInput").value;

    addReview(name, rating, comment);

    feedbackForm.reset();
  });
}

