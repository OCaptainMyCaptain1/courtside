// ---------- Cart data (stored in localStorage) ----------

function getCart() {
  const cartData = localStorage.getItem("cart");
  return cartData ? JSON.parse(cartData) : [];
}

// Save the cart, then update the badge and the slide-in panel
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  refreshCartUI();
}

// Add an item, or increase its quantity if the same name AND options are already there
function addToCart(name, price, options) {
  const cart = getCart();
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

// Add or subtract from an item's quantity (going below 1 removes it)
function changeQuantity(index, change) {
  const cart = getCart();
  cart[index].quantity += change;
  if (cart[index].quantity < 1) {
    cart.splice(index, 1);
  }
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function calculateTotal(cart) {
  let total = 0;
  for (let i = 0; i < cart.length; i++) {
    total += cart[i].price * cart[i].quantity;
  }
  return total;
}

// Total number of items (so 3 trail mixes counts as 3)
function countItems(cart) {
  let count = 0;
  for (let i = 0; i < cart.length; i++) {
    count += cart[i].quantity;
  }
  return count;
}

// ---------- Slide-in cart panel ----------

function openCart() {
  document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartDrawer").classList.add("open");
}

function closeCart() {
  document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("cartDrawer").classList.remove("open");
}

// Build the panel once and add it to the page (so no page needs its own copy of the HTML)
function buildCartDrawer() {
  const overlay = document.createElement("div");
  overlay.id = "cartOverlay";
  overlay.className = "cart-overlay";

  const drawer = document.createElement("aside");
  drawer.id = "cartDrawer";
  drawer.className = "cart-drawer";
  drawer.setAttribute("aria-label", "Shopping cart");
  drawer.innerHTML = `
    <div class="drawer-header">
      <h2>Your Cart</h2>
      <button id="closeCartBtn" class="drawer-close" aria-label="Close cart">&times;</button>
    </div>
    <div id="drawerItems" class="drawer-items"></div>
    <div id="drawerFooter" class="drawer-footer">
      <p id="drawerTotal" class="cart-total"></p>
      <a href="checkout.html" class="checkout-link">Checkout</a>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  overlay.addEventListener("click", closeCart);
  document.getElementById("closeCartBtn").addEventListener("click", closeCart);

  // One click listener for every +, -, and Remove button inside the panel
  document.getElementById("drawerItems").addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const index = Number(button.getAttribute("data-index"));
    const action = button.getAttribute("data-action");

    if (action === "increase") changeQuantity(index, 1);
    if (action === "decrease") changeQuantity(index, -1);
    if (action === "remove") removeFromCart(index);
  });
}

// Redraw everything that shows cart data: the nav badge and the panel contents
function refreshCartUI() {
  const cart = getCart();

  document.querySelectorAll(".cart-count").forEach(function (badge) {
    badge.textContent = countItems(cart);
  });

  const drawerItems = document.getElementById("drawerItems");
  if (drawerItems) {
    const footer = document.getElementById("drawerFooter");

    if (cart.length === 0) {
      drawerItems.innerHTML = `<p class="drawer-empty">Your cart is empty. Add something from the shops to get started.</p>`;
      footer.classList.add("hidden");
    } else {
      footer.classList.remove("hidden");
      drawerItems.innerHTML = "";

      cart.forEach(function (item, index) {
        const subtotal = item.price * item.quantity;
        const optionsLine = item.options ? `<p class="drawer-item-options">${item.options}</p>` : "";

        drawerItems.innerHTML += `
          <div class="drawer-item">
            <p class="drawer-item-name">${item.name} &ndash; $${item.price.toFixed(2)}</p>
            ${optionsLine}
            <div class="drawer-item-row">
              <div class="qty-controls">
                <button class="qty-btn" data-action="decrease" data-index="${index}" aria-label="Decrease quantity">&minus;</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-action="increase" data-index="${index}" aria-label="Increase quantity">+</button>
              </div>
              <strong>$${subtotal.toFixed(2)}</strong>
              <button class="removeBtn" data-action="remove" data-index="${index}">Remove</button>
            </div>
          </div>
        `;
      });

      document.getElementById("drawerTotal").innerHTML = `Total: $${calculateTotal(cart).toFixed(2)}`;
    }
  }

  // Let other scripts (like the checkout page) know the cart changed
  document.dispatchEvent(new Event("cartchanged"));
}

// ---------- Set up on every page ----------
buildCartDrawer();

const cartLink = document.getElementById("cartLink");
if (cartLink) {
  cartLink.addEventListener("click", function (event) {
    event.preventDefault(); // stay on this page; the panel slides in instead
    openCart();
  });
}

// Keyboard event: Escape closes the panel
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeCart();
});

refreshCartUI();
