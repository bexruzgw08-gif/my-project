# KerakBo‘lsa

**Sotib olma — kerak bo‘lsa, ijaraga ol!** · *Don’t buy it — rent it when you need it!* · *Не покупай — арендуй, когда нужно!*

KerakBo‘lsa is a social-impact rental marketplace (web app) where people rent items they need only temporarily, and earn money by renting out things that sit unused at home. One account can both rent and rent out.

> Hackathon MVP. Demo listings, demo users and identity verification are **clearly labelled as demo**. There is no online payment: requests are approved by the owner and payment/deposit are settled at handover.

---

## Features

- **Homepage**: hero, search with live suggestions, 6 categories, featured items, per-category sections, “how it works”, owner promotion, footer.
- **Catalogue**: server-side search (title, description, category, city/region), category, min/max daily price, location, “available now”, “delivery available”, sorting, pagination. All filters live in the URL.
- **Product page**: gallery with thumbnails, specs, usage info, accessories, pickup instructions, approximate map location (OpenStreetMap), owner card, availability, hourly/daily/weekly prices, deposit, live server-computed estimate, booked periods, similar items, image credits.
- **Auth**: registration (name, email, password + confirmation, terms), login, logout, persistent session (httpOnly JWT cookie), protected pages, return-to-intended-page after login, language choice after sign-up.
- **3 languages**: O‘zbekcha, Русский, English (entire interface; saved to the profile).
- **Listings**: 6-step form (basics → photos with cover/remove → prices → region/city/map (manual click or opt-in geolocation) → availability, delivery, terms, damage policy → preview & publish), drafts, edit, pause/reactivate, delete with confirmation. Ownership is enforced on the server.
- **Identity verification (DEMO)**: not started → pending → verified/rejected. Only document type + last 4 characters are stored; no document images. Required on the server to publish listings and to send rental requests.
- **Bookings**: 3-step request flow (period & pickup/delivery → price breakdown + terms acceptance → confirmation). Prices are always computed on the server. Statuses: pending, accepted, rejected, cancelled, active, completed, with validated transitions. Overlapping confirmed bookings are impossible (per-product lock + atomic status updates); conflicting pending requests are auto-declined on acceptance. Owner contact details are revealed only after acceptance.
- **Dashboard**: overview with real counts, my listings, incoming requests, my rentals (pending/upcoming/active/history), favourites, notifications, profile, settings (language, password).
- **Favourites** persisted in MongoDB; **in-app notifications** for requests and status changes.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, JavaScript/JSX, Tailwind CSS 4, React Router 7, Axios, Lucide icons, React Hook Form, i18next/react-i18next, Leaflet + react-leaflet (OpenStreetMap) |
| Backend | Node.js (ES modules), Express 5, Mongoose 8, JWT, bcrypt, Zod, Multer, Helmet, CORS, express-rate-limit, Cloudinary (optional) |
| Database | MongoDB Atlas — or a built-in local development database (mongodb-memory-server) when no URI is set |
| Tests | Node test runner + Supertest (in-memory MongoDB) |

## Folder structure

```
my-project/
├── backend/
│   ├── src/
│   │   ├── config/        env validation, DB connection
│   │   ├── models/        User, Verification, Category, Product, Booking, Favorite, Notification
│   │   ├── routes/        REST routes (/api/...)
│   │   ├── controllers/   request handlers
│   │   ├── services/      pricing, booking (locking/transitions), storage, notifications
│   │   ├── middleware/    auth, validation, rate limiting, error handling
│   │   ├── validators/    Zod schemas
│   │   ├── seed/          demo data, seed images + credits.json
│   │   ├── app.js         Express app
│   │   └── server.js      entry point
│   └── tests/             pricing + API integration tests
├── frontend/
│   └── src/
│       ├── components/    layout, ui, product, map
│       ├── context/       auth, favourites, toasts
│       ├── i18n/          uz / ru / en translations
│       ├── lib/           api client, formatting, regions
│       └── pages/         Home, Catalog, ProductDetail, BookingPage, Auth, ListingForm, Verification, dashboard/…
├── .env.example
├── package.json           root convenience scripts
├── README.md
└── PROGRESS.md
```

## Prerequisites

- Node.js **20.19+** (tested with 22.19) and npm 10+
- Optional: a MongoDB Atlas cluster; optional: a Cloudinary account

## Setup

```bash
# 1. Install everything (root + backend + frontend)
npm run install:all

# 2. Create the backend environment file
cp .env.example backend/.env
#    then set JWT_SECRET (and MONGODB_URI if you use Atlas)
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### MongoDB Atlas

1. Create a free cluster at <https://cloud.mongodb.com>, add a database user and allow your IP (Network Access).
2. Copy the connection string and put it in `backend/.env`:
   `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kerakbolsa?retryWrites=true&w=majority`
3. Restart the backend. The log will say `Connected to MongoDB (MONGODB_URI)` and `GET /api/health` reports `"mode": "atlas"`.

**Without `MONGODB_URI`** the backend starts a **local development database** (mongodb-memory-server). Data is kept in `backend/.data/mongo` on your computer only. The footer shows “Demo mode: local database” and `/api/health` reports `"mode": "local-dev"`. Not for production.

### Cloudinary (optional)

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to store listing photos persistently in Cloudinary. Without them, uploads are saved to `backend/uploads/` and served by the API — fine for local demos, **not persistent hosting**.

## Run

```bash
npm run dev            # backend + frontend together
# or in two terminals:
npm run dev:backend    # http://localhost:5000  (health: /api/health)
npm run dev:frontend   # http://localhost:5173
```

Open **http://localhost:5173**. Vite proxies `/api`, `/uploads` and `/seed-images` to the backend, so the browser talks to one origin.

### Demo data

On first start with an empty database the backend seeds 6 categories, 4 demo owners and 24 demo listings (all marked *Demo*). Re-seed at any time (only demo records are replaced; real users and listings are kept):

```bash
npm run seed
```

Demo login (verified): `aziz.demo@kerakbolsa.uz` / `Demo12345` (also `malika.demo@…`, `jasur.demo@…`, `nodira.demo@…`, same password).
Demo photos are openly licensed images from Openverse; author and licence are shown on each product page and listed in `backend/src/seed/images/credits.json`.

## Tests & build

```bash
npm test          # backend: pricing unit tests + API integration tests (in-memory MongoDB)
npm run build     # frontend production build -> frontend/dist
```

The API tests cover auth, catalogue filters, ownership enforcement, verification requirements, server-side pricing, booking transitions, **concurrent acceptance of overlapping requests**, favourites, dashboard counts and privacy of verification data.

## API overview

`GET /api/health` · `POST /api/auth/register|login|logout` · `GET /api/auth/me` · `PATCH /api/users/me`, `/me/language`, `/me/password` · `GET /api/users/me/products|dashboard`, `/api/users/:id` · `GET /api/categories` · `GET /api/products` (q, category, minPrice, maxPrice, location, region, city, available, delivery, sort, page, limit) · `GET /api/products/suggestions|locations|:id|:id/similar|:id/booked` · `POST /api/products` · `PATCH /api/products/:id`, `/:id/status` · `DELETE /api/products/:id` · `POST /api/uploads/images` · `GET|POST|DELETE /api/favorites…` · `POST /api/bookings/quote` · `POST /api/bookings` · `GET /api/bookings?role=renter|owner&scope=upcoming|active|history` · `PATCH /api/bookings/:id/status` · `GET /api/notifications`, `PATCH …/read-all`, `…/:id/read` · `GET /api/verification/me`, `POST /api/verification/submit|demo-review`

Responses: `{ "success": true, "data": … }` or `{ "success": false, "error": { "code", "message", "details?" } }`.

## Security notes

- Passwords hashed with bcrypt (12 rounds); JWT in an httpOnly, SameSite=Lax cookie; Helmet, CORS allow-list, rate limiting (strict in production).
- All input validated with Zod (unknown fields rejected). Prices, totals, owner ids and permissions are never taken from the client.
- Non-owners only receive an approximate location (~1 km); contacts are shared only after a booking is accepted.
- Uploaded files are checked by magic bytes (JPG/PNG/WEBP, ≤ 5 MB, ≤ 8 per listing); listings may only reference images uploaded through the platform.

## Known limitations

- Identity verification is a **simulation**. A real deployment should use a licensed KYC provider (e.g. via MyID/OneID in Uzbekistan or an international KYC service): the provider performs document + liveness checks, and the backend stores only the provider’s reference id and result, received via a signed webhook.
- No online payments, reviews, or real-time chat (by design for the MVP).
- Local image storage and the local development database are not suitable for production.
- Map tiles come from the public OpenStreetMap tile server (fine for demos; use a tile provider for production traffic).

## GitHub

This project lives in the connected repository `bexruzgw08-gif/my-project` (branch `main`). `.env`, `node_modules`, `backend/.data`, `backend/uploads` and `frontend/dist` are git-ignored.

## Deployment options (future)

- **Backend**: Render / Railway / Fly.io (Node), with `NODE_ENV=production`, `MONGODB_URI` (Atlas), `JWT_SECRET`, `CLIENT_ORIGIN`, Cloudinary keys.
- **Frontend**: Vercel / Netlify static build. Either proxy `/api` to the backend (recommended — keeps the cookie same-site) or set `VITE_API_URL` and serve both under one domain.
