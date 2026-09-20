// Show/hide the court number field based on the checkbox
const onCourtCheckbox = document.getElementById("onCourtCheckbox");
if (onCourtCheckbox) {
  onCourtCheckbox.addEventListener("change", function () {
    const wrapper = document.getElementById("courtNumberWrapper");
    if (onCourtCheckbox.checked) {
      wrapper.classList.remove("hidden");
    } else {
      wrapper.classList.add("hidden");
    }
  });
}

// Handle every "Add to Cart" button on this page
const addButtons = document.querySelectorAll(".addBtn");
addButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const name = button.getAttribute("data-name");
    let price = parseFloat(button.getAttribute("data-price"));

    // If this item is priced per unit (like per day), calculate the real price
    const pricingType = button.getAttribute("data-pricing");
    if (pricingType === "perDay") {
      const daysSelectId = button.getAttribute("data-days-select");
      const daysSelect = document.getElementById(daysSelectId);
      const selectedOption = daysSelect.options[daysSelect.selectedIndex];
      const days = parseFloat(selectedOption.getAttribute("data-days"));
      price = price * days;
    }

    // Gather every variant dropdown inside this same product card
    const card = button.closest(".product-card");
    const variantSelects = card.querySelectorAll(".variantSelect");

    const optionParts = [];
    variantSelects.forEach(function (select) {
      optionParts.push(select.value);
    });
    const options = optionParts.join(", ");

    addToCart(name, price, options);

    const message = document.getElementById("addMessage");
    message.innerHTML = `${name} added to cart!`;
  });
});