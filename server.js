require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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
  optionLabel: String,
  optionValues: [String],
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
  const products = JSON.parse(fs.readFileSync(file, 'utf8')).map(function (p) {
    return { ...p, optionValues: p.optionValues || [] };
  });

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

// Save a new order
app.post('/api/orders', async (req, res) => {
  try {
    const b = req.body;
    // Only these fields are saved. Card details are never accepted.
    const order = await Order.create({
      orderNumber: b.orderNumber,
      customerName: b.customerName,
      email: b.email,
      fulfillment: b.fulfillment,
      courtNumber: b.courtNumber,
      items: b.items,
      subtotal: b.subtotal,
      tax: b.tax,
      total: b.total
    });
    res.status(201).json({ id: order._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
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