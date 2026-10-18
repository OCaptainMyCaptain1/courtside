// ---------- Tax ----------

const TAX_RATE = 0.08;
const TAX_PERCENT_TEXT = Math.round(TAX_RATE * 100) + "%";

// Tax on a subtotal, rounded to the nearest cent
function calculateTax(subtotal) {
  return Math.round((subtotal * TAX_RATE + Number.EPSILON) * 100) / 100;
}

// ---------- Lesson dates (shared by the lesson page, the cart, and checkout) ----------

// How far ahead a lesson can be booked. Change this one number to adjust the window.
const MAX_BOOKING_MONTHS = 6;

// Turn a Date into YYYY-MM-DD in the customer's own time zone
function dateToString(date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function todayString() {
  return dateToString(new Date());
}

// The last bookable day: today plus MAX_BOOKING_MONTHS
function maxDateString() {
  const limit = new Date();
  limit.setMonth(limit.getMonth() + MAX_BOOKING_MONTHS);
  return dateToString(limit);
}

// Compare two YYYY-MM-DD strings as numbers (so a 6-digit year like 275760 is handled correctly).
// Returns a negative number, zero, or a positive number.
function compareDateStrings(a, b) {
  const aParts = a.split("-").map(Number);
  const bParts = b.split("-").map(Number);
  for (let i = 0; i < 3; i++) {
    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
  }
  return 0;
}

// "9:00 AM" -> minutes since midnight (540). Returns NaN if the text is not a time like that.
function lessonMinutes(timeText) {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(timeText || "");
  if (!match) return NaN;
  return ((Number(match[1]) % 12) + (match[3] === "PM" ? 12 : 0)) * 60 + Number(match[2]);
}

// True if a lesson on this date at this time has already started
function hasLessonTimePassed(dateString, timeText) {
  const comparison = compareDateStrings(dateString, todayString());
  if (comparison < 0) return true;
  if (comparison > 0) return false;
  const now = new Date();
  return lessonMinutes(timeText) <= now.getHours() * 60 + now.getMinutes();
}

// Why a lesson in the cart can no longer be booked ("" if it is still fine)
function lessonProblem(item) {
  if (!item.date || !item.time) return "";
  if (compareDateStrings(item.date, maxDateString()) > 0) {
    return "it is more than " + MAX_BOOKING_MONTHS + " months away";
  }
  if (hasLessonTimePassed(item.date, item.time)) return "that time has passed";
  return "";
}

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

// Add a private lesson. Lessons are one-per-slot, so they never stack into a quantity.
// Returns "added", "duplicate" (same coach, date, and time), or "conflict" (a different coach at the same date and time).
function addLessonToCart(name, price, options, date, time) {
  const cart = getCart();

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].type !== "lesson") continue;
    if (cart[i].options === options) return "duplicate";
    if (cart[i].date === date && cart[i].time === time) return "conflict";
  }

  cart.push({ name: name, price: price, quantity: 1, options: options, type: "lesson", date: date, time: time });
  saveCart(cart);
  return "added";
}

// Take lessons out of the cart if their time has passed (or they are outside the booking window).
// Returns a list of { item, reason } for whatever was removed.
function removeExpiredLessons() {
  const cart = getCart();
  const keep = [];
  const removed = [];

  cart.forEach(function (item) {
    const reason = item.type === "lesson" ? lessonProblem(item) : "";
    if (reason) {
      removed.push({ item: item, reason: reason });
    } else {
      keep.push(item);
    }
  });

  if (removed.length > 0) saveCart(keep);
  return removed;
}

// Tell the customer what was removed. The notice stays until they close it.
function announceExpiredLessons(removed) {
  const details = removed.map(function (entry) {
    return entry.item.options + " (" + entry.reason + ")";
  }).join("; ");
  const noun = removed.length === 1 ? "lesson" : "lessons";
  showToast("We removed " + removed.length + " " + noun + " from your cart: " + details + ".", { type: "warning", duration: 0 });
}

// True if the cart has anything that is not a lesson (snacks, gear, services need pickup or court delivery)
function hasPhysicalItems(cart) {
  return cart.some(function (item) {
    return item.type !== "lesson";
  });
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

// Subtotal before tax, rounded to the cent
function calculateTotal(cart) {
  let total = 0;
  for (let i = 0; i < cart.length; i++) {
    total += cart[i].price * cart[i].quantity;
  }
  return Math.round(total * 100) / 100;
}

// Subtotal plus tax
function calculateOrderTotal(cart) {
  const subtotal = calculateTotal(cart);
  return Math.round((subtotal + calculateTax(subtotal)) * 100) / 100;
}

// Total number of items (so 3 trail mixes counts as 3)
function countItems(cart) {
  let count = 0;
  for (let i = 0; i < cart.length; i++) {
    count += cart[i].quantity;
  }
  return count;
}

// ---------- Toast messages ----------
// A short message that sits at the bottom of the screen wherever the customer has scrolled.
// It pauses while the mouse is over it or keyboard focus is inside it, and can be closed early.

const TOAST_DURATION = 8000; // milliseconds
let dismissCurrentToast = null;

function buildToastRegion() {
  const region = document.createElement("div");
  region.id = "toastRegion";
  region.className = "toast-region";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  document.body.appendChild(region);
}

// options: type ("success" or "warning"), duration (ms, 0 = stays until closed),
//          actionLabel + onAction (an optional button, like "View cart")
function showToast(message, options) {
  options = options || {};
  const region = document.getElementById("toastRegion");
  const opener = document.activeElement; // so focus can return there if the toast opens the cart
  const duration = options.duration === undefined ? TOAST_DURATION : options.duration;

  if (dismissCurrentToast) dismissCurrentToast(); // one message at a time; the newest replaces the old

  const toast = document.createElement("div");
  toast.className = "toast" + (options.type === "warning" ? " toast-warning" : "");

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = options.type === "warning" ? "!" : "\u2713";

  const text = document.createElement("p");
  text.className = "toast-text";
  text.textContent = message;

  toast.append(icon, text);

  if (options.actionLabel && options.onAction) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "toast-action";
    action.textContent = options.actionLabel;
    action.addEventListener("click", function () {
      dismiss();
      options.onAction(opener);
    });
    toast.appendChild(action);
  }

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "Dismiss message");
  close.innerHTML = "&times;";
  close.addEventListener("click", dismiss);
  toast.appendChild(close);

  region.appendChild(toast);
  requestAnimationFrame(function () {
    toast.classList.add("show");
  });

  // Timer that can be paused and resumed
  let timerId = null;
  let remaining = duration;
  let startedAt = 0;
  let hovering = false;
  let focused = false;

  function startTimer() {
    if (duration === 0 || timerId !== null) return;
    startedAt = Date.now();
    timerId = setTimeout(dismiss, remaining);
  }

  function pauseTimer() {
    if (timerId === null) return;
    clearTimeout(timerId);
    timerId = null;
    remaining = Math.max(remaining - (Date.now() - startedAt), 2000); // always leave a couple of seconds after a pause
  }

  function syncTimer() {
    if (hovering || focused) pauseTimer();
    else startTimer();
  }

  toast.addEventListener("mouseenter", function () { hovering = true; syncTimer(); });
  toast.addEventListener("mouseleave", function () { hovering = false; syncTimer(); });
  toast.addEventListener("focusin", function () { focused = true; syncTimer(); });
  toast.addEventListener("focusout", function (event) {
    focused = toast.contains(event.relatedTarget);
    syncTimer();
  });

  function dismiss() {
    if (timerId !== null) clearTimeout(timerId);
    timerId = null;
    if (dismissCurrentToast === dismiss) dismissCurrentToast = null;
    toast.remove();
  }

  dismissCurrentToast = dismiss;
  startTimer();
}

// ---------- Slide-in cart panel ----------

// The element that had focus before the panel opened, so focus can go back there on close
let lastFocusedBeforeCart = null;

function openCart(returnFocusTo) {
  // (a click passes an event here, so only accept a real element)
  lastFocusedBeforeCart = returnFocusTo instanceof HTMLElement ? returnFocusTo : document.activeElement;
  const expired = removeExpiredLessons();
  if (expired.length > 0) announceExpiredLessons(expired);
  document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("closeCartBtn").focus();
}

function closeCart() {
  const drawer = document.getElementById("cartDrawer");
  const wasOpen = drawer.classList.contains("open");

  document.getElementById("cartOverlay").classList.remove("open");
  drawer.classList.remove("open");

  if (wasOpen && lastFocusedBeforeCart && document.contains(lastFocusedBeforeCart)) {
    lastFocusedBeforeCart.focus();
  }

  // If focus could not go back (nothing suitable to return to), don't leave it on a button inside the closed panel
  if (drawer.contains(document.activeElement)) document.activeElement.blur();
}

// Tell screen reader users what changed (the text is read aloud by the status region)
function announceCartChange(text) {
  const region = document.getElementById("cartAnnounce");
  region.textContent = "";
  setTimeout(function () {
    region.textContent = text;
  }, 50);
}

// Build the panel once and add it to the page (so no page needs its own copy of the HTML)
function buildCartDrawer() {
  const overlay = document.createElement("div");
  overlay.id = "cartOverlay";
  overlay.className = "cart-overlay";

  const drawer = document.createElement("aside");
  drawer.id = "cartDrawer";
  drawer.className = "cart-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-labelledby", "cartTitle");
  drawer.innerHTML = `
    <div class="drawer-header">
      <h2 id="cartTitle">Your Cart</h2>
      <button id="closeCartBtn" class="drawer-close" aria-label="Close cart">&times;</button>
    </div>
    <div id="drawerItems" class="drawer-items"></div>
    <p id="cartAnnounce" class="visually-hidden" role="status"></p>
    <div id="drawerFooter" class="drawer-footer">
      <div class="totals">
        <p class="totals-line"><span>Subtotal</span><span id="drawerSubtotal"></span></p>
        <p class="totals-line"><span>Tax (${TAX_PERCENT_TEXT})</span><span id="drawerTax"></span></p>
      </div>
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
    const itemBefore = getCart()[index];
    const removed = action === "remove" || (action === "decrease" && itemBefore.quantity === 1);

    if (action === "increase") changeQuantity(index, 1);
    if (action === "decrease") changeQuantity(index, -1);
    if (action === "remove") removeFromCart(index);

    // The list is redrawn after every change, so put keyboard focus back where the customer was working
    const cartAfter = getCart();
    const items = document.getElementById("drawerItems");
    let nextFocus;

    if (removed) {
      announceCartChange(itemBefore.name + " removed from cart.");
      nextFocus = cartAfter.length > 0
        ? items.querySelector('button[data-action="remove"][data-index="' + Math.min(index, cartAfter.length - 1) + '"]')
        : document.getElementById("closeCartBtn");
    } else {
      announceCartChange(itemBefore.name + ", quantity " + cartAfter[index].quantity + ".");
      nextFocus = items.querySelector('button[data-action="' + action + '"][data-index="' + index + '"]');
    }

    if (nextFocus) nextFocus.focus();
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
      drawerItems.innerHTML = `<p class="drawer-empty">Your cart is empty. Book a lesson or add something from the shops to get started.</p>`;
      footer.classList.add("hidden");
    } else {
      footer.classList.remove("hidden");
      drawerItems.innerHTML = "";

      cart.forEach(function (item, index) {
        const subtotal = item.price * item.quantity;
        const optionsLine = item.options ? `<p class="drawer-item-options">${item.options}</p>` : "";

        // A lesson is a single reserved slot, so it gets a label instead of + and - buttons
        const quantityControls = item.type === "lesson"
          ? `<span class="lesson-tag">1 lesson</span>`
          : `<div class="qty-controls">
                <button class="qty-btn" data-action="decrease" data-index="${index}" aria-label="Decrease quantity of ${item.name}">&minus;</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-action="increase" data-index="${index}" aria-label="Increase quantity of ${item.name}">+</button>
              </div>`;

        drawerItems.innerHTML += `
          <div class="drawer-item">
            ${productThumbHTML(item.name)}
            <div class="drawer-item-body">
              <p class="drawer-item-name">${item.name} &ndash; $${item.price.toFixed(2)}</p>
              ${optionsLine}
              <div class="drawer-item-row">
                ${quantityControls}
                <strong>$${subtotal.toFixed(2)}</strong>
                <button class="removeBtn" data-action="remove" data-index="${index}" aria-label="Remove ${item.name} from cart">Remove</button>
              </div>
            </div>
          </div>
        `;
      });

      const cartSubtotal = calculateTotal(cart);
      document.getElementById("drawerSubtotal").textContent = "$" + cartSubtotal.toFixed(2);
      document.getElementById("drawerTax").textContent = "$" + calculateTax(cartSubtotal).toFixed(2);
      document.getElementById("drawerTotal").textContent = "Total: $" + calculateOrderTotal(cart).toFixed(2);
    }
  }

  // Let other scripts (like the checkout page) know the cart changed
  document.dispatchEvent(new Event("cartchanged"));
}

// ---------- Set up on every page ----------
buildToastRegion();
buildCartDrawer();

const cartLink = document.getElementById("cartLink");
if (cartLink) {
  // The Cart link opens a panel, so tell assistive technology it behaves like a button
  cartLink.setAttribute("role", "button");
  cartLink.setAttribute("aria-haspopup", "dialog");

  cartLink.addEventListener("click", function (event) {
    event.preventDefault(); // stay on this page; the panel slides in instead
    openCart();
  });

  // Buttons also open with the Space bar (Enter already works on a link)
  cartLink.addEventListener("keydown", function (event) {
    if (event.key === " ") {
      event.preventDefault();
      openCart();
    }
  });
}

// Mark the current page in the nav for screen readers
const currentPage = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll("nav a[href]").forEach(function (link) {
  if (link.getAttribute("href") === currentPage) link.setAttribute("aria-current", "page");
});

// Keyboard: Escape closes the panel, and Tab stays inside it while it is open
document.addEventListener("keydown", function (event) {
  const drawer = document.getElementById("cartDrawer");
  if (!drawer.classList.contains("open")) return;

  if (event.key === "Escape") {
    closeCart();
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = Array.from(drawer.querySelectorAll("button, a[href]")).filter(function (element) {
    return element.getClientRects().length > 0;
  });
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

// Drop lessons whose time has passed (they may have been saved days ago), and say so
const expiredAtLoad = removeExpiredLessons();
refreshCartUI();
if (expiredAtLoad.length > 0) announceExpiredLessons(expiredAtLoad);
