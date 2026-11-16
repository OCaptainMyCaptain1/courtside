require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const orderSchema = new mongoose.Schema({
  orderNumber: String,
  customerName: { type: String, required: true },
  email: { type: String, required: true },
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

app.get('/api/orders', async (req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

app.listen(3000, () => console.log('Running at http://localhost:3000'));