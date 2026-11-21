require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { priceOrder, OrderError } = require('./order-pricing');
const lessonRules = require('./lesson-rules');
const { hashPassword, verifyPassword, burnTime, signToken, readToken } = require('./auth');

const app = express();
app.disable('x-powered-by');                 // don't advertise which framework we use
app.use(express.json({ limit: '100kb' }));   // refuse oversized request bodies

// The website itself: the Angular app, built by "npm run build" into client/dist
const CLIENT_DIST = path.join(__dirname, 'client', 'dist', 'client', 'browser');
app.use(express.static(CLIENT_DIST));

// Falls back to a local MongoDB if no .env is provided
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/courtside';
const PORT = process.env.PORT || 3000;

// The secret that signs login tokens. If none is set in .env, make a random one;
// everyone is then signed out whenever the server restarts.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set in .env, so logins will end when the server restarts.');
}

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
  image: String,           // e.g. "images/products/sports-drink.jpg" (empty until a photo is added)
  imageAlt: String,        // describes the photo for screen reader users
  imageCredit: String,     // e.g. "Photo by Jane Doe on Unsplash"
  imageCreditUrl: String,  // link to the photo's page
  inStock: { type: Boolean, default: true }
});
const Product = mongoose.model('Product', productSchema);

// A customer account. Only a hash of the password is stored, never the password itself.
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

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

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 300 },
  createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

const orderSchema = new mongoose.Schema({
  orderNumber: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // empty for guest orders
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
  const publicFolder = path.join(__dirname, 'client', 'public');
  const products = JSON.parse(fs.readFileSync(file, 'utf8')).map(function (product) {
    // Only use a photo if its file is really there, so a missing photo never shows as a broken image
    const hasPhoto = product.image && fs.existsSync(path.join(publicFolder, product.image));
    return { ...product, image: hasPhoto ? product.image : null };
  });

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

// The two starter reviews (data/reviews.json). $setOnInsert means a review is only added
// if it is missing, so nothing a customer wrote is ever overwritten.
async function seedReviews() {
  const file = path.join(__dirname, 'data', 'reviews.json');
  const reviews = JSON.parse(fs.readFileSync(file, 'utf8'));

  await Review.bulkWrite(reviews.map(function (review) {
    return {
      updateOne: {
        filter: { name: review.name, comment: review.comment },
        update: { $setOnInsert: review },
        upsert: true
      }
    };
  }));

  console.log('Reviews ready');
}

mongoose.connect(MONGODB_URI)
  .then(function () {
    console.log('Connected to MongoDB');
    return seedProducts();
  })
  .then(seedCoaches)
  .then(seedReviews)
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

// ---------- Accounts ----------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// What the browser is allowed to know about a user (never the password hash)
function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email };
}

// Returns the id of the signed-in user, or null for a guest
function signedInUserId(req) {
  const header = req.get('Authorization') || '';
  return readToken(header.startsWith('Bearer ') ? header.slice(7) : '', JWT_SECRET);
}

// Routes that need a signed-in user use this: it stops the request if nobody is signed in
function requireAuth(req, res, next) {
  const userId = signedInUserId(req);
  if (!userId) return res.status(401).json({ error: 'Please sign in.' });
  req.userId = userId;
  next();
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');

    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'Enter your full name.' });
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 100) {
      return res.status(400).json({ error: 'Passwords must be 8 to 100 characters long.' });
    }

    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await User.create({ name: name, email: email, passwordHash: passwordHash });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ error: 'An account with that email already exists. Try signing in instead.' });
      }
      throw err;
    }

    res.status(201).json({ token: signToken(user._id, JWT_SECRET), user: publicUser(user) });
  } catch (err) {
    console.error('Register failed:', err);
    res.status(500).json({ error: 'We could not create your account. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');

    const user = email && password.length <= 100 ? await User.findOne({ email: email }) : null;

    let matches = false;
    if (user) matches = await verifyPassword(password, user.passwordHash);
    else await burnTime(password.slice(0, 100));   // unknown email: take the same time as a real check

    // The same message for a wrong email and a wrong password, so it does not reveal which accounts exist
    if (!matches) return res.status(401).json({ error: 'Incorrect email or password.' });

    res.json({ token: signToken(user._id, JWT_SECRET), user: publicUser(user) });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'We could not sign you in. Please try again.' });
  }
});

// Who is signed in? (The browser calls this on page load to check its saved token is still good.)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(401).json({ error: 'Please sign in.' });
    res.json(publicUser(user));
  } catch (err) {
    res.status(401).json({ error: 'Please sign in.' });
  }
});

// The signed-in user's own orders, newest first
app.get('/api/orders/mine', requireAuth, async (req, res) => {
  try {
    res.json(await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100).lean());
  } catch (err) {
    res.status(500).json({ error: 'Could not load your orders.' });
  }
});

// ---------- Reviews ----------

// All reviews, oldest first (so new ones appear at the bottom of the list)
app.get('/api/reviews', async (req, res) => {
  try {
    res.json(await Review.find().sort({ createdAt: 1 }).limit(200).lean());
  } catch (err) {
    res.status(500).json({ error: 'Could not load reviews.' });
  }
});

// Save a new review after checking it
app.post('/api/reviews', async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const comment = String(b.comment || '').trim();
    const rating = Number(b.rating);

    if (name === '') return res.status(400).json({ error: 'Please enter your name.' });
    if (name.length > 60) return res.status(400).json({ error: 'Names can be up to 60 characters.' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please enter a rating from 1 to 5.' });
    }
    if (comment === '') return res.status(400).json({ error: 'Please write a comment.' });
    if (comment.length > 300) return res.status(400).json({ error: 'Comments can be up to 300 characters.' });

    const review = await Review.create({ name: name, rating: rating, comment: comment });
    res.status(201).json(review);
  } catch (err) {
    console.error('Review failed:', err);
    res.status(500).json({ error: 'We could not save your review. Please try again.' });
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
        userId: signedInUserId(req) || undefined,   // signed-in customers get the order saved to their account
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

// ---------- Everything else ----------

// An /api address that doesn't exist
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Any other page address (like /lessons) gets the Angular app, which then shows the right page.
// This is what lets a customer refresh the page, or open a link directly, without an error.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  const indexFile = path.join(CLIENT_DIST, 'index.html');
  if (!fs.existsSync(indexFile)) {
    return res.status(503).send('The website has not been built yet. Stop the server, run "npm run build", then run "npm start".');
  }
  res.sendFile(indexFile);
});

app.listen(PORT, () => console.log('Running at http://localhost:' + PORT));
