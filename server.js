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
  customerName: String,
  items: [{ name: String, variant: String, quantity: Number, price: Number }],
  subtotal: Number,
  tax: Number,
  total: Number,
  fulfillment: String,
  courtNumber: String,
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

app.post('/api/orders', async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json({ id: order._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

app.listen(3000, () => console.log('Running at http://localhost:3000'));