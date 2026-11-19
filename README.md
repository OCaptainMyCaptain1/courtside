# CourtSide

CourtSide is a tennis club web application: customers can book private lessons with live coach
availability, shop for snacks, gear, and racquet services, check out as a guest or with an account,
and read and write reviews. It is a **class prototype** (no real payments, and the club details are samples).

Built with the **MEAN stack**: **M**ongoDB, **E**xpress, **A**ngular, and **N**ode.js.

---

## 1. What you need

- **Node.js 22.22.3 or newer** (Angular 22 needs it; Node 24 and 26 also work). Check with `node -v`.
- **A MongoDB database**, one of these:
  - **MongoDB Atlas** (cloud, free tier). Use the connection string supplied with the submission, or create your own free cluster at https://www.mongodb.com/atlas.
  - **A local MongoDB** (Community Server) running on the default port. No settings needed.

## 2. Install and run

Open a terminal in this folder and run:

```
npm install
```

This installs the server packages and (automatically) the Angular packages in `client/`. It can take a few minutes.

**Set up the database connection.** Copy `.env.example` to a new file named `.env`, then edit it:

| Setting | What to put |
| --- | --- |
| `MONGODB_URI` | Your Atlas connection string. **Delete this line** to use a local MongoDB instead. |
| `JWT_SECRET` | Any long random text (optional; without it, logins end each time the server restarts). |
| `PORT` | Optional. Defaults to 3000. |

> If using Atlas: under **Network Access**, the machine running the app must be allowed (for a quick test, allow `0.0.0.0/0`).
> Passwords containing symbols must be URL-encoded inside the connection string.

**Build the website, then start the server:**

```
npm run build
npm start
```

Open **http://localhost:3000**.

On first start the server fills the database automatically (14 products, 5 coaches, 2 starter reviews), so no manual database setup is needed.
You should see `Connected to MongoDB`, `Products ready`, `Coaches ready`, and `Reviews ready` in the terminal.

### Developing (optional)

To work on the Angular code with live reload, run the server (`npm start`) and in a second terminal run `npm run dev:client`, then open http://localhost:4200. The Angular dev server forwards `/api` requests to the Express server (see `client/proxy.conf.json`).

## 3. Try it

- **Test card:** at checkout click **Fill in test card** (no real card is ever used, and card details are never saved or sent).
- **Book a lesson:** pick a coach, a date, and a time. Times already booked with that coach appear crossed out.
- **Order lookup:** after an order, use **Find my order** (footer) with the order number and email.
- **Accounts:** create an account to see order history and skip retyping your details. Guest checkout always works.

## 4. How it fits together

```
Browser (Angular app)  ──/api requests──▶  Express server (Node.js)  ──▶  MongoDB
  pages, forms, cart                        pricing, rules, login          products, coaches,
  (cart kept in the browser)                                               bookings, orders,
                                                                           reviews, users
```

- **Angular** (`client/src/app`): one component per page or widget, services for talking to the API, an HTTP interceptor (adds the login token), and a route guard (protects My Account).
- **Express** (`server.js`): serves the built Angular app and the JSON API.
- **MongoDB** collections: `products`, `coaches`, `bookings` (unique index on coach + date + time prevents double-booking), `orders`, `reviews`, `users`.
- **The server never trusts browser prices.** `order-pricing.js` prices every order from the database; `lesson-rules.js` enforces lesson times and dates.
- **Passwords** are stored only as salted scrypt hashes (`auth.js`); sessions use signed tokens (JWT).

### API summary

| Endpoint | Purpose |
| --- | --- |
| `GET /api/products?category=` | Products for a shop page |
| `GET /api/lessons`, `GET /api/lessons/availability` | Lesson info, and booked times for a coach and date |
| `POST /api/orders` | Place an order (priced and validated on the server) |
| `GET /api/orders/lookup` | Find one order by order number **and** email |
| `GET /api/orders/mine` | The signed-in customer's orders |
| `GET /api/reviews`, `POST /api/reviews` | Read and add reviews |
| `POST /api/auth/register`, `/login`, `GET /api/auth/me` | Accounts |

### Project layout

```
server.js            Express server and API routes
auth.js              Password hashing and login tokens
order-pricing.js     Server-side order pricing and checks
lesson-rules.js      Lesson time and date rules
products/            Product catalog loaded into MongoDB (products.json)
data/                Coaches and starter reviews loaded into MongoDB
client/              Angular application (src/app has the components and services)
.env.example         Template for your own .env (never commit .env)
```

## 5. Known limitations (prototype)

No real payments, no confirmation emails, no password reset, no login rate limiting, no admin or coach accounts,
lesson times follow the server's clock rather than a business time zone, and the club details shown are sample content.
