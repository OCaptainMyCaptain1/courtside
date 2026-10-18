// ---------- Helpers ----------

function formatMoney(amount) {
  return "$" + amount.toFixed(2);
}

// Work out what a card currently costs, based on the options chosen on it.
// Returns { total, unitPrice, days }. "days" is only set for per-day rentals.
function getCardPrice(card, button) {
  let price = parseFloat(button.getAttribute("data-price"));

  // A button option can carry its own price (like grip installation)
  const pricedChoice = card.querySelector(".choice-group input:checked[data-price]");
  if (pricedChoice) price = parseFloat(pricedChoice.getAttribute("data-price"));

  // Per-day pricing (rentals)
  if (button.getAttribute("data-pricing") === "perDay") {
    const daysChoice = card.querySelector(".choice-group input:checked[data-days]");
    const days = parseFloat(daysChoice.getAttribute("data-days"));
    return { total: price * days, unitPrice: price, days: days };
  }

  return { total: price, unitPrice: price, days: null };
}

// ---------- Product photos ----------

// Any card whose product has an entry in product-images.js gets its photo (or placeholder) at the top
document.querySelectorAll(".product-card").forEach(function (card) {
  const button = card.querySelector(".addBtn");
  if (!button) return;
  const photo = buildProductPhoto(button.getAttribute("data-name"));
  if (photo) card.prepend(photo);
});

// ---------- Price shown on the card ----------

// When the customer picks a button option with its own price, show that price on the card.
document.querySelectorAll(".choice-group").forEach(function (group) {
  const hasPrices = Array.from(group.querySelectorAll("input")).some(function (input) {
    return input.getAttribute("data-price");
  });
  if (!hasPrices) return;

  const priceLabel = group.closest(".product-card").querySelector(".product-price");

  function updatePrice() {
    const checked = group.querySelector("input:checked");
    priceLabel.textContent = "$" + parseFloat(checked.getAttribute("data-price")).toFixed(2);
  }

  group.addEventListener("change", updatePrice);
  updatePrice();
});

// ---------- Live total next to each Add to Cart button ----------

document.querySelectorAll(".addBtn").forEach(function (button) {
  const card = button.closest(".product-card");

  const totalLine = document.createElement("p");
  totalLine.className = "live-total";
  totalLine.setAttribute("aria-live", "polite");
  button.before(totalLine);

  function updateTotal() {
    const info = getCardPrice(card, button);
    const withTax = info.total + calculateTax(info.total);
    if (info.days) {
      const dayWord = info.days === 1 ? "day" : "days";
      totalLine.textContent = "Estimated total: " + formatMoney(withTax) + " (" + info.days + " " + dayWord + " \u00d7 " + formatMoney(info.unitPrice) + ", plus " + TAX_PERCENT_TEXT + " tax)";
    } else {
      totalLine.textContent = "Estimated total: " + formatMoney(withTax) + " (includes " + TAX_PERCENT_TEXT + " tax)";
    }
  }

  card.addEventListener("change", updateTotal);
  updateTotal();
});

// ---------- Stringing tension: lbs or kg ----------

const KG_PER_LB = 0.45359237;

// Each unit has its own range and step. Half-kilo steps are about 1.1 lbs, close to the whole-pound steps.
const TENSION_UNITS = {
  lb: {
    min: 40, max: 70, step: 1, placeholder: "e.g. 55", suffix: " lbs", label: "Tension (lbs):",
    hint: "Range: 40 to 70 lbs, whole numbers.",
    error: "Enter a whole-number tension between 40 and 70 lbs."
  },
  kg: {
    min: 18, max: 32, step: 0.5, placeholder: "e.g. 25", suffix: " kg", label: "Tension (kg):",
    hint: "Range: 18 to 32 kg, in steps of 0.5.",
    error: "Enter a tension between 18 and 32 kg, in steps of 0.5 (for example 24.5)."
  }
};

const unitSwitch = document.querySelector(".unit-switch");
if (unitSwitch) {
  const tensionInput = document.getElementById("stringTension");
  const tensionCard = unitSwitch.closest(".product-card");
  let currentUnit = "lb";

  // Convert a typed value to the new unit, rounded to that unit's step and kept inside its range
  function convertTension(value, toUnit) {
    const settings = TENSION_UNITS[toUnit];
    let converted = toUnit === "kg" ? Math.round(value * KG_PER_LB * 2) / 2 : Math.round(value / KG_PER_LB);
    converted = Math.min(settings.max, Math.max(settings.min, converted));
    return converted;
  }

  unitSwitch.addEventListener("change", function () {
    const newUnit = unitSwitch.querySelector("input:checked").value;
    if (newUnit === currentUnit) return;

    const settings = TENSION_UNITS[newUnit];
    const typed = tensionInput.value;

    tensionInput.min = settings.min;
    tensionInput.max = settings.max;
    tensionInput.step = settings.step;
    tensionInput.placeholder = settings.placeholder;
    tensionInput.setAttribute("data-suffix", settings.suffix);
    tensionInput.setAttribute("data-error", settings.error);
    document.getElementById("tensionLabel").textContent = settings.label;
    document.getElementById("tensionHint").textContent = settings.hint;

    // Keep what the customer already typed, converted to the new unit
    if (typed !== "" && !isNaN(Number(typed))) {
      tensionInput.value = convertTension(Number(typed), newUnit);
    }

    tensionCard.querySelector(".field-error").textContent = "";
    tensionInput.classList.remove("invalid");
    currentUnit = newUnit;
  });
}

// ---------- Clear the error message as soon as the customer starts fixing a text box ----------

document.querySelectorAll(".variantInput").forEach(function (input) {
  input.addEventListener("input", function () {
    input.closest(".product-card").querySelector(".field-error").textContent = "";
    input.classList.remove("invalid");
  });
});

// ---------- Add to Cart ----------

document.querySelectorAll(".addBtn").forEach(function (button) {
  button.addEventListener("click", function () {
    const card = button.closest(".product-card");
    const name = button.getAttribute("data-name");

    // 1. Check any typed-in options (like string tension) before adding anything
    const variantInputs = card.querySelectorAll(".variantInput");
    for (let i = 0; i < variantInputs.length; i++) {
      const input = variantInputs[i];
      if (!input.checkValidity()) {
        card.querySelector(".field-error").textContent = input.getAttribute("data-error");
        input.classList.add("invalid");
        input.focus();
        return;
      }
    }

    // 2. The price comes from the same function that fills the live total
    const price = getCardPrice(card, button).total;

    // 3. Collect every button group and text box in this card, in page order
    //    (the lbs/kg switch is skipped: its unit is already part of the tension text)
    const optionParts = [];
    card.querySelectorAll(".choice-group:not(.unit-switch), .variantInput").forEach(function (field) {
      if (field.classList.contains("choice-group")) {
        optionParts.push(field.querySelector("input:checked").value);
      } else {
        optionParts.push(field.value + (field.getAttribute("data-suffix") || ""));
      }
    });

    const options = optionParts.join(", ");
    addToCart(name, price, options);
    showToast(name + (options ? " (" + options + ")" : "") + " added to your cart.", {
      actionLabel: "View cart",
      onAction: openCart
    });
  });
});
