// Get the cart from localStorage, or start with an empty array
function getCart() {
  const cartData = localStorage.getItem("cart");
  return cartData ? JSON.parse(cartData) : [];
}

// Save the cart array back to localStorage
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Add an item to the cart, or increase its quantity if it's already there
function addToCart(name, price, options) {
  const cart = getCart();

  // Check if this exact item (same name AND same options) is already in the cart
  const existingItem = cart.find(function (item) {
    return item.name === name && item.options === options;
  });

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name: name, price: price, quantity: 1, options: options });
  }

  saveCart(cart);
}

// Calculate the total price of everything in the cart
function calculateTotal(cart) {
  let total = 0;

  for (let i = 0; i < cart.length; i++) {
    total += cart[i].price * cart[i].quantity;
  }

  return total;
}

// Remove an item from the cart by its position in the array
function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

// Runs when "Complete Purchase" is clicked
const checkoutBtn = document.getElementById("checkoutBtn");
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", function () {
    const cart = getCart();
    const message = document.getElementById("checkoutMessage");

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const total = calculateTotal(cart);
    message.innerHTML = `Thanks for your order! Your total was $${total.toFixed(2)}. We'll have it ready shortly.`;

    localStorage.removeItem("cart");
    renderCart();
  });
}

// Build the cart table on the page based on current cart data
function renderCart() {
  const cart = getCart();
  const cartBody = document.getElementById("cartBody");
  const cartTotal = document.getElementById("cartTotal");

  if (!cartBody) return; // only run this on pages that have a cart table

  cartBody.innerHTML = "";

  cart.forEach(function (item, index) {
    const row = document.createElement("tr");
    const subtotal = item.price * item.quantity;

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.options}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>${item.quantity}</td>
      <td>$${subtotal.toFixed(2)}</td>
      <td><button class="removeBtn" data-index="${index}">Remove</button></td>
    `;

    cartBody.appendChild(row);
  });

  const total = calculateTotal(cart);
  cartTotal.innerHTML = `Total: $${total.toFixed(2)}`;

  // Attach click handlers to all the new Remove buttons
  const removeButtons = document.querySelectorAll(".removeBtn");
  removeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const index = button.getAttribute("data-index");
      removeFromCart(index);
      renderCart(); // rebuild the table after removing
    });
  });
}

renderCart();