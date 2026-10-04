// Some dropdown options carry their own price (like grip installation).
// When the customer changes the dropdown, show the matching price on the card.
document.querySelectorAll(".product-card select").forEach(function (select) {
  const hasPrices = Array.from(select.options).some(function (option) {
    return option.getAttribute("data-price");
  });
  if (!hasPrices) return;

  const priceLabel = select.closest(".product-card").querySelector(".product-price");

  function updatePrice() {
    const option = select.options[select.selectedIndex];
    priceLabel.textContent = "$" + parseFloat(option.getAttribute("data-price")).toFixed(2);
  }

  select.addEventListener("change", updatePrice);
  updatePrice();
});

// Clear the error message as soon as the customer starts fixing a text box
document.querySelectorAll(".variantInput").forEach(function (input) {
  input.addEventListener("input", function () {
    input.closest(".product-card").querySelector(".field-error").textContent = "";
    input.classList.remove("invalid");
  });
});

// Handle every "Add to Cart" button on this page
document.querySelectorAll(".addBtn").forEach(function (button) {
  button.addEventListener("click", function () {
    const card = button.closest(".product-card");
    const message = document.getElementById("addMessage");
    const name = button.getAttribute("data-name");
    let price = parseFloat(button.getAttribute("data-price"));

    // 1. Check any typed-in options (like string tension) before adding anything
    const variantInputs = card.querySelectorAll(".variantInput");
    for (let i = 0; i < variantInputs.length; i++) {
      const input = variantInputs[i];
      if (!input.checkValidity()) {
        card.querySelector(".field-error").textContent = input.getAttribute("data-error");
        input.classList.add("invalid");
        input.focus();
        message.textContent = "";
        return;
      }
    }

    // 2. If the selected dropdown option has its own price, use it
    card.querySelectorAll("select").forEach(function (select) {
      const optionPrice = select.options[select.selectedIndex].getAttribute("data-price");
      if (optionPrice) price = parseFloat(optionPrice);
    });

    // 3. Per-day pricing (rentals)
    if (button.getAttribute("data-pricing") === "perDay") {
      const daysSelect = document.getElementById(button.getAttribute("data-days-select"));
      const days = parseFloat(daysSelect.options[daysSelect.selectedIndex].getAttribute("data-days"));
      price = price * days;
    }

    // 4. Collect every dropdown and text box in this card, in page order
    const optionParts = [];
    card.querySelectorAll(".variantSelect, .variantInput").forEach(function (field) {
      optionParts.push(field.value + (field.getAttribute("data-suffix") || ""));
    });

    addToCart(name, price, optionParts.join(", "));
    message.textContent = name + " added to cart!";
  });
});
