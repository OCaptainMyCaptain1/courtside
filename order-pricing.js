// Works out what an order costs, using prices from the database.
// The browser's prices are never trusted: only product names, options, and quantities are used.

const { formatLessonDate, checkLessonSlot } = require('./lesson-rules');

const TAX_RATE = 0.08;

// An order problem the customer can fix (bad option, out of stock, and so on)
class OrderError extends Error {}

function roundCents(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// Find which option the customer picked. The cart stores options as text,
// like "Replacement Grip" or "Polyester, 55 lbs", so match on how the text starts.
function findOption(product, optionsText) {
  return product.options.find(function (option) {
    return optionsText === option.value || optionsText.startsWith(option.value + ', ');
  });
}

// Check the typed-in string tension, which comes after the string type ("Polyester, 55 lbs")
function checkTension(product, optionsText) {
  const match = /, (\d+(?:\.\d+)?) (lbs|kg)$/.exec(optionsText);
  if (!match) throw new OrderError('Enter a string tension for ' + product.name + '.');

  const value = Number(match[1]);
  const valid = match[2] === 'lbs'
    ? Number.isInteger(value) && value >= 40 && value <= 70
    : Number.isInteger(value * 2) && value >= 18 && value <= 32;

  if (!valid) throw new OrderError('That string tension is outside the allowed range.');
}

// Price of ONE of this item (rentals: price per day x number of days)
function unitPrice(product, optionsText) {
  let option = null;

  if (product.options.length > 0) {
    option = findOption(product, optionsText);
    if (!option) throw new OrderError('Choose a valid option for ' + product.name + '.');
  }
  if (product.hasTension) checkTension(product, optionsText);

  const base = option && option.price != null ? option.price : product.price;
  const days = product.pricing === 'perDay' && option && option.days ? option.days : 1;
  return roundCents(base * days);
}

// items: the cart as the browser sent it. products: matching products from MongoDB.
// coachNames: the coaches that exist (from MongoDB).
// Returns the priced lines and the totals, or throws an OrderError.
function priceOrder(items, products, coachNames) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new OrderError('Your cart is empty or has too many items.');
  }

  const byName = new Map(products.map(function (product) { return [product.name, product]; }));
  const lines = [];
  const lessonSlots = [];

  items.forEach(function (item) {
    const name = String(item.name || '');
    const product = byName.get(name);
    if (!product) throw new OrderError('"' + name + '" is not in our catalog.');
    if (!product.inStock) throw new OrderError(product.name + ' is out of stock.');

    const options = String(item.options || '');
    const isLesson = product.category === 'lesson';
    const quantity = isLesson ? 1 : Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new OrderError('Invalid quantity for ' + product.name + '.');
    }

    const line = {
      name: product.name,
      price: unitPrice(product, options),
      quantity: quantity,
      options: options
    };

    if (isLesson) {
      const coach = String(item.coach || '');
      const date = String(item.date || '');
      const time = String(item.time || '');

      if (!(coachNames || []).includes(coach)) throw new OrderError('Choose a coach for your lesson.');
      const problem = checkLessonSlot(date, time);
      if (problem) throw new OrderError('The lesson with ' + coach + ' cannot be booked: ' + problem + '.');

      // The server writes the description itself, so it always matches what is booked
      line.options = coach + ', ' + formatLessonDate(date) + ', ' + time;
      line.type = 'lesson';
      line.coach = coach;
      line.date = date;
      line.time = time;

      // The same coach (or the same customer) cannot be in two places at once
      lessonSlots.forEach(function (other) {
        if (other.date === date && other.time === time) {
          throw new OrderError(other.coach === coach
            ? 'You added the same lesson twice.'
            : 'You have two lessons at the same date and time. Remove one.');
        }
      });
      lessonSlots.push({ coach: coach, date: date, time: time });
    }

    lines.push(line);
  });

  const subtotal = roundCents(lines.reduce(function (sum, line) { return sum + line.price * line.quantity; }, 0));
  const tax = roundCents(subtotal * TAX_RATE);
  const total = roundCents(subtotal + tax);

  return { lines: lines, subtotal: subtotal, tax: tax, total: total };
}

module.exports = { priceOrder, OrderError, TAX_RATE };
