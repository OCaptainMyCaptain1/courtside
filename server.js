require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { priceOrder, OrderError } = require('./order-pricing');

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

mongoose.connect(MONGODB_URI)
  .then(function () {
    console.log('Connected to MongoDB');
    return seedProducts();
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
    const priced = priceOrder(b.items, products);

    const orderNumber = await newOrderNumber();
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
