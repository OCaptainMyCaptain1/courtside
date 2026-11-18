require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { priceOrder, OrderError } = require('./order-pricing');
const lessonRules = require('./lesson-rules');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Falls back to a local MongoDB if no .env is provided
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/courtside';
const PORT = process.env.PORT || 3000;

// ---------- Models ----------

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,        // snack, proshop, or service
  price: Number,
  priceUnit: String,
  priceNote: String,
  pricing: String,         // "perDay" for rentals, otherwise empty
  optionLabel: String,     // e.g. "Grip Size"
  options: [{ _id: false, value: String, price: Number, days: Number }],
  hasTension: Boolean,     // true if the customer types a string tension (stringing)
  inStock: { type: Boolean, default: true }
});
const Product = mongoose.model('Product', productSchema);

const coachSchema = new mongoose.Schema({
  name: { type: String, required: true },
  focus: String,
  position: Number
});
const Coach = mongoose.model('Coach', coachSchema);

// One document per booked lesson. The unique index on coach + date + time is what
// makes double-booking impossible: MongoDB itself refuses a second booking for the same slot.
const bookingSchema = new mongoose.Schema({
  coach: { type: String, required: true },
  date: { type: String, required: true },   // YYYY-MM-DD
  time: { type: String, required: true },   // e.g. "9:00 AM"
  orderNumber: String,
  createdAt: { type: Date, default: Date.now }
});
bookingSchema.index({ coach: 1, date: 1, time: 1 }, { unique: true });
const Booking = mongoose.model('Booking', bookingSchema);

const orderSchema = new mongoose.Schema({
  orderNumber: String,
  customerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  fulfillment: String,
  courtNumber: String,
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    options: String,
    type: { type: String },
    coach: String,
    date: String,
    time: String
  }],
  subtotal: Number,
  tax: Number,
  total: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// ---------- Seed the catalog from products.json ----------
// Adds missing products and updates existing ones by name.
// inStock is only set on first insert, so changes made in the database survive a restart.

async function seedProducts() {
  const file = path.join(__dirname, 'products', 'products.json');
  const products = JSON.parse(fs.readFileSync(file, 'utf8'));

  // Remove the old optionValues field left on products saved before options had prices
  await Product.collection.updateMany({}, { $unset: { optionValues: '' } });

  await Product.bulkWrite(products.map(function (p) {
    const { inStock, ...rest } = p;
    return {
      updateOne: {
        filter: { name: rest.name },
        update: { $set: rest, $setOnInsert: { inStock: inStock } },
        upsert: true
      }
    };
  }));

  console.log('Products ready (' + products.length + ' in catalog)');
}

// Same idea for the coaches (data/coaches.json)
async function seedCoaches() {
  const file = path.join(__dirname, 'data', 'coaches.json');
  const coaches = JSON.parse(fs.readFileSync(file, 'utf8'));

  await Coach.bulkWrite(coaches.map(function (coach) {
    return { updateOne: { filter: { name: coach.name }, update: { $set: coach }, upsert: true } };
  }));

  console.log('Coaches ready (' + coaches.length + ')');
}

mongoose.connect(MONGODB_URI)
  .then(function () {
    console.log('Connected to MongoDB');
    return seedProducts();
  })
  .then(seedCoaches)
  .then(function () {
    return Booking.init();   // makes sure the unique booking index exists before orders arrive
  })
  .catch(function (err) {
    console.error('MongoDB connection error:', err);
  });

// ---------- API ----------

// All products, or one category: /api/products?category=snack
app.get('/api/products', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    res.json(await Product.find(filter).sort({ _id: 1 }).lean());
  } catch (err) {
    res.status(500).json({ error: 'Could not load products.' });
  }
});

// Everything the lesson page needs: price, coaches, and the times that can be booked
app.get('/api/lessons', async (req, res) => {
  try {
    const product = await Product.findOne({ category: 'lesson' }).lean();
    const coaches = await Coach.find().sort({ position: 1 }).lean();
    if (!product) return res.status(404).json({ error: 'Lessons are not available right now.' });

    res.json({
      name: product.name,
      description: product.description,
      price: product.price,
      coaches: coaches,
      timeGroups: lessonRules.TIME_GROUPS
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load lessons.' });
  }
});

// Which times one coach already has booked on one day: /api/lessons/availability?coach=Coach 1&date=2026-12-05
app.get('/api/lessons/availability', async (req, res) => {
  try {
    const coach = String(req.query.coach || '');
    const date = String(req.query.date || '');
    if (!coach || !lessonRules.isRealDate(date)) {
      return res.status(400).json({ error: 'A coach and a valid date are required.' });
    }

    const bookings = await Booking.find({ coach: coach, date: date }).lean();
    res.json({ coach: coach, date: date, bookedTimes: bookings.map(function (booking) { return booking.time; }) });
  } catch (err) {
    res.status(500).json({ error: 'Could not check availability.' });
  }
});

// ---------- Orders ----------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Order numbers look like CS-48213. Try again if one is already taken.
async function newOrderNumber() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const number = 'CS-' + crypto.randomInt(10000, 100000);
    if (!(await Order.exists({ orderNumber: number }))) return number;
  }
  throw new Error('Could not create an order number.');
}

// Place a new order. The server checks the customer details, then prices every
// item from the database itself, so a browser cannot change what it pays.
app.post('/api/orders', async (req, res) => {
  try {
    const b = req.body || {};
    const customerName = String(b.customerName || '').trim();
    const email = String(b.email || '').trim();
    const courtNumber = String(b.courtNumber || '').trim();

    if (customerName.length < 2) throw new OrderError('Enter your full name.');
    if (!EMAIL_PATTERN.test(email)) throw new OrderError('Enter a valid email address.');
    if (!['pickup', 'court', 'none'].includes(b.fulfillment)) throw new OrderError('Choose pickup or court delivery.');
    if (b.fulfillment === 'court' && courtNumber === '') throw new OrderError('Enter your court number.');

    const names = Array.isArray(b.items) ? b.items.map(function (item) { return String(item && item.name); }) : [];
    const products = await Product.find({ name: { $in: names } }).lean();
    const coachNames = (await Coach.find().lean()).map(function (coach) { return coach.name; });
    const priced = priceOrder(b.items, products, coachNames);

    const orderNumber = await newOrderNumber();

    // Reserve the lesson slots first. If MongoDB refuses one because it is already booked,
    // undo the ones we just made and tell the customer.
    const reserved = [];
    try {
      for (const line of priced.lines.filter(function (line) { return line.type === 'lesson'; })) {
        reserved.push(await Booking.create({ coach: line.coach, date: line.date, time: line.time, orderNumber: orderNumber }));
      }
    } catch (err) {
      await Booking.deleteMany({ _id: { $in: reserved.map(function (booking) { return booking._id; }) } });
      if (err && err.code === 11000) {
        const slot = err.keyValue || {};
        return res.status(409).json({
          error: slot.coach + ' at ' + lessonRules.formatLessonDate(slot.date) + ', ' + slot.time +
            ' was just booked by someone else. Remove that lesson from your cart and choose another time.'
        });
      }
      throw err;
    }

    try {
      await Order.create({
        orderNumber: orderNumber,
        customerName: customerName,
        email: email,
        fulfillment: b.fulfillment,
        courtNumber: b.fulfillment === 'court' ? courtNumber : '',
        items: priced.lines,
        subtotal: priced.subtotal,
        tax: priced.tax,
        total: priced.total
      });
    } catch (err) {
      // The order did not save, so give the lesson slots back
      await Booking.deleteMany({ _id: { $in: reserved.map(function (booking) { return booking._id; }) } });
      throw err;
    }

    res.status(201).json({
      orderNumber: orderNumber,
      subtotal: priced.subtotal,
      tax: priced.tax,
      total: priced.total
    });
  } catch (err) {
    if (err instanceof OrderError) return res.status(400).json({ error: err.message });
    console.error('Order failed:', err);
    res.status(500).json({ error: 'We could not save your order. Please try again.' });
  }
});

// Look up one order. Needs BOTH the order number and the email it was placed with.
app.get('/api/orders/lookup', async (req, res) => {
  try {
    const orderNumber = String(req.query.orderNumber || '').trim();
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'Order number and email are required.' });
    }

    const order = await Order.findOne({ orderNumber: orderNumber, email: email });
    if (!order) {
      return res.status(404).json({ error: 'No order found for that order number and email.' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Could not look up that order.' });
  }
});

app.listen(PORT, () => console.log('Running at http://localhost:' + PORT));
