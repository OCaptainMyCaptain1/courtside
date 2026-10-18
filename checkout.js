// Checkout page. PROTOTYPE ONLY: nothing typed here is saved, stored, or sent anywhere.

const TEST_CARD = "4242424242424242";
let orderPlaced = false;

const checkoutForm = document.getElementById("checkoutForm");
const courtRadio = document.getElementById("fulfillCourt");
const pickupRadio = document.getElementById("fulfillPickup");

// ---------- Order summary (kept in sync with the cart panel) ----------

function renderSummary() {
  if (orderPlaced) return;

  const cart = getCart();
  document.getElementById("emptyCheckout").classList.toggle("hidden", cart.length > 0);
  document.getElementById("checkoutLayout").classList.toggle("hidden", cart.length === 0);

  const summaryItems = document.getElementById("summaryItems");
  summaryItems.innerHTML = "";

  cart.forEach(function (item) {
    const optionsLine = item.options ? `<small>${item.options}</small>` : "";
    summaryItems.innerHTML += `
      <div class="summary-line">
        <span class="summary-item">
          ${productThumbHTML(item.name)}
          <span>${item.quantity} &times; ${item.name}${optionsLine}</span>
        </span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>`;
  });

  const subtotal = calculateTotal(cart);
  const totalText = "Total: $" + calculateOrderTotal(cart).toFixed(2);
  document.getElementById("summarySubtotal").textContent = "$" + subtotal.toFixed(2);
  document.getElementById("summaryTaxLabel").textContent = "Tax (" + TAX_PERCENT_TEXT + ")";
  document.getElementById("summaryTax").textContent = "$" + calculateTax(subtotal).toFixed(2);
  document.getElementById("summaryTotal").textContent = totalText;
  document.getElementById("placeOrderTotal").textContent = totalText + " (includes " + TAX_PERCENT_TEXT + " tax)";

  // Pickup and court delivery only matter if the order has something to hand over (lessons alone don't)
  const needsFulfillment = hasPhysicalItems(cart);
  document.getElementById("fulfillmentSection").classList.toggle("hidden", !needsFulfillment);
  if (!needsFulfillment) {
    pickupRadio.checked = true;
    updateFulfillment();
  }
}

document.addEventListener("cartchanged", renderSummary);
renderSummary();

// ---------- Pickup vs. court delivery ----------

function updateFulfillment() {
  document.getElementById("courtNumberWrapper").classList.toggle("hidden", !courtRadio.checked);
  if (!courtRadio.checked) {
    showError(document.getElementById("courtNumber"), "");
  }
}

pickupRadio.addEventListener("change", updateFulfillment);
courtRadio.addEventListener("change", updateFulfillment);

// ---------- Validation (each function returns an error message, or "" if the value is fine) ----------

function checkExpiry(value) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return "Enter the expiry date as MM/YY.";

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
  return expired ? "This card has expired." : "";
}

const validators = {
  checkoutName: function (value) {
    return value.trim().length < 2 ? "Enter your full name." : "";
  },
  checkoutEmail: function (value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? "" : "Enter a valid email, like name@example.com.";
  },
  courtNumber: function (value) {
    return courtRadio.checked && value.trim() === "" ? "Enter your court number so we know where to deliver your order." : "";
  },
  cardNumber: function (value) {
    const digits = value.replace(/\s/g, "");
    if (digits === "") return "Click \"Fill in test card\" below. Do not enter a real card.";
    return digits === TEST_CARD ? "" : "This prototype only accepts the test card. Click \"Fill in test card\" instead.";
  },
  cardExpiry: checkExpiry,
  cardCvc: function (value) {
    return /^\d{3}$/.test(value) ? "" : "Enter the 3-digit security code.";
  }
};

function showError(input, message) {
  document.getElementById(input.id + "Error").textContent = message;
  input.classList.toggle("invalid", message !== "");
  // Let screen readers know the field has a problem and where the message is
  input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
}

// Validate when the customer leaves a box (blur); once a box shows an error, re-check as they type (input)
Object.keys(validators).forEach(function (id) {
  const input = document.getElementById(id);
  input.setAttribute("aria-describedby", id + "Error");

  input.addEventListener("blur", function () {
    showError(input, validators[id](input.value));
  });

  input.addEventListener("input", function () {
    if (input.classList.contains("invalid")) {
      showError(input, validators[id](input.value));
    }
  });
});

// ---------- Auto-formatting while typing ----------

document.getElementById("cardNumber").addEventListener("input", function (event) {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 16);
  event.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
});

document.getElementById("cardExpiry").addEventListener("input", function (event) {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
  event.target.value = digits.length >= 3 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
});

document.getElementById("cardCvc").addEventListener("input", function (event) {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 3);
});

// ---------- Test card button ----------

document.getElementById("fillTestCardBtn").addEventListener("click", function () {
  document.getElementById("cardNumber").value = "4242 4242 4242 4242";
  document.getElementById("cardExpiry").value = "12/30";
  document.getElementById("cardCvc").value = "123";

  ["cardNumber", "cardExpiry", "cardCvc"].forEach(function (id) {
    showError(document.getElementById(id), "");
  });
});

// ---------- Place order ----------

// The box at the top of the form that lists every problem, with a link to each field
function showErrorSummary(errors) {
  const summary = document.getElementById("errorSummary");
  summary.innerHTML = "";

  const heading = document.createElement("h3");
  heading.id = "errorSummaryTitle";
  heading.textContent = errors.length === 1
    ? "1 problem to fix before you can place your order:"
    : errors.length + " problems to fix before you can place your order:";

  const list = document.createElement("ul");
  errors.forEach(function (error) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + error.id;
    link.textContent = error.message;
    link.addEventListener("click", function (event) {
      event.preventDefault();
      document.getElementById(error.id).focus();
    });
    item.appendChild(link);
    list.appendChild(item);
  });

  summary.append(heading, list);
  summary.classList.remove("hidden");
  summary.focus(); // screen readers read the summary; keyboard users can tab to any link in it
}

function hideErrorSummary() {
  document.getElementById("errorSummary").classList.add("hidden");
}

checkoutForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // A lesson saved earlier may have started while this page was open. Remove it before taking the order.
  const expired = removeExpiredLessons();
  if (expired.length > 0) {
    announceExpiredLessons(expired);
    return;
  }

  // The summary announces all the problems at once, so keep the field-by-field messages quiet this one time
  const errorLines = document.querySelectorAll(".error-text");
  errorLines.forEach(function (line) { line.setAttribute("aria-live", "off"); });

  const errors = [];
  Object.keys(validators).forEach(function (id) {
    const input = document.getElementById(id);
    const message = validators[id](input.value);
    showError(input, message);
    if (message !== "") errors.push({ id: id, message: message });
  });

  setTimeout(function () {
    errorLines.forEach(function (line) { line.setAttribute("aria-live", "polite"); });
  }, 300);

  if (errors.length > 0) {
    showErrorSummary(errors);
    return;
  }

  hideErrorSummary();
  placeOrder();
});

function placeOrder() {
  const cart = getCart();
  const subtotal = calculateTotal(cart);
  const tax = calculateTax(subtotal);
  const total = calculateOrderTotal(cart);
  const orderNumber = "CS-" + Math.floor(10000 + Math.random() * 90000);
  const firstName = document.getElementById("checkoutName").value.trim().split(" ")[0];
  const court = document.getElementById("courtNumber").value.trim();

  const lessons = cart.filter(function (item) {
    return item.type === "lesson";
  });

  let fulfillmentText = "";
  if (hasPhysicalItems(cart)) {
    fulfillmentText = courtRadio.checked
      ? "We'll deliver your order to court " + court + "."
      : "Pick up your order at the CourtSide front desk.";
  }

  orderPlaced = true;

  document.getElementById("confirmTitle").textContent = "Thanks for your order, " + firstName + "!";
  document.getElementById("confirmNumber").textContent = orderNumber;
  document.getElementById("confirmFulfillment").textContent = fulfillmentText;
  document.getElementById("confirmFulfillment").classList.toggle("hidden", fulfillmentText === "");

  const lessonList = document.getElementById("confirmLessons");
  lessonList.innerHTML = "";
  lessons.forEach(function (lesson) {
    const li = document.createElement("li");
    li.textContent = lesson.options;
    lessonList.appendChild(li);
  });
  document.getElementById("confirmLessonsWrapper").classList.toggle("hidden", lessons.length === 0);
  document.getElementById("confirmTotal").textContent = "$" + total.toFixed(2) + " (includes $" + tax.toFixed(2) + " tax)";

  // Wipe everything: the form (including the card boxes) and the cart
  checkoutForm.reset();
  localStorage.removeItem("cart");
  refreshCartUI();

  document.getElementById("checkoutLayout").classList.add("hidden");
  document.getElementById("confirmation").classList.remove("hidden");
  window.scrollTo(0, 0);

  // Move keyboard and screen reader focus to the confirmation, since the form it was on is gone
  const confirmTitle = document.getElementById("confirmTitle");
  confirmTitle.setAttribute("tabindex", "-1");
  confirmTitle.focus();
}
