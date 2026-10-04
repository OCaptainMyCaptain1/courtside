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
        <span>${item.quantity} &times; ${item.name}${optionsLine}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>`;
  });

  document.getElementById("summaryTotal").textContent = "Total: $" + calculateTotal(cart).toFixed(2);
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
    return courtRadio.checked && value.trim() === "" ? "Enter your court number so we know where to bring your order." : "";
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
}

// Validate when the customer leaves a box (blur); once a box shows an error, re-check as they type (input)
Object.keys(validators).forEach(function (id) {
  const input = document.getElementById(id);

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

checkoutForm.addEventListener("submit", function (event) {
  event.preventDefault();

  let firstInvalid = null;
  Object.keys(validators).forEach(function (id) {
    const input = document.getElementById(id);
    const message = validators[id](input.value);
    showError(input, message);
    if (message !== "" && firstInvalid === null) firstInvalid = input;
  });

  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  placeOrder();
});

function placeOrder() {
  const cart = getCart();
  const total = calculateTotal(cart);
  const orderNumber = "CS-" + Math.floor(10000 + Math.random() * 90000);
  const firstName = document.getElementById("checkoutName").value.trim().split(" ")[0];
  const court = document.getElementById("courtNumber").value.trim();

  const fulfillmentText = courtRadio.checked
    ? "We'll bring your order to court " + court + "."
    : "Pick up your order at the CourtSide front desk.";

  orderPlaced = true;

  document.getElementById("confirmTitle").textContent = "Thanks for your order, " + firstName + "!";
  document.getElementById("confirmNumber").textContent = orderNumber;
  document.getElementById("confirmFulfillment").textContent = fulfillmentText;
  document.getElementById("confirmTotal").textContent = "$" + total.toFixed(2);

  // Wipe everything: the form (including the card boxes) and the cart
  checkoutForm.reset();
  localStorage.removeItem("cart");
  refreshCartUI();

  document.getElementById("checkoutLayout").classList.add("hidden");
  document.getElementById("confirmation").classList.remove("hidden");
  window.scrollTo(0, 0);
}
