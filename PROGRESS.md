# PROGRESS — KerakBo‘lsa

_Last updated: 2026-10-10_

## Status

MVP complete and running locally. Frontend: http://localhost:5173 · Backend: http://localhost:5000

## Completed phases

1. **Inspection** — workspace had only `my-project/README.md`, git repo on `main` connected to `github.com/bexruzgw08-gif/my-project`. Node 22.19, npm 10.9.
2. **Structure & dependencies** — `backend/`, `frontend/`, root scripts, `.gitignore`, `.env.example`.
3. **Backend core** — env validation, MongoDB connection (Atlas or local dev DB), models, auth (bcrypt + JWT cookie), categories, products, search/filters, seed (6 categories, 4 demo owners, 24 demo listings with openly licensed photos).
4. **Listings, verification, favourites, bookings** — ownership checks, drafts/publish/pause/delete, demo verification, server-side pricing, booking lifecycle with validated transitions, per-product lock against overlapping confirmations, notifications.
5. **Frontend & design system** — brand colours/typography, header with search suggestions and three-dot menu, footer, skeletons, empty/error states, toasts, modals.
6. **Frontend ↔ backend** — all pages use the real API (no frontend-only filtering).
7. **i18n & responsive** — uz/ru/en (511 keys each, parity checked automatically); responsive layouts, mobile filter drawer.
8. **Testing & fixes** — see below.
9. **Local run** — backend and frontend started and verified.

## Tests actually executed

- `npm test` (backend): **32 tests, 32 passed, 0 failed** — pricing unit tests; API tests for auth, catalogue filters/sort/pagination, approximate location, ownership enforcement, verification requirements, image URL restrictions, favourites, server-computed booking price, invalid transitions, **concurrent accept of overlapping requests (exactly one succeeds)**, contact reveal after acceptance, dashboard counts, verification privacy.
- Browser end-to-end run (puppeteer-core + local Chrome), **all steps passed, no console errors**: mobile layout (390 px, 0 px horizontal overflow) → unauthenticated rent request redirects to login → registration → language choice (English) → returned to booking → demo verification → 3-step booking request → demo owner logs in and accepts → owner creates a listing through all 6 steps with photo upload and map click and publishes it → renter sees “Accepted” with owner phone/email → favourite → notifications → dashboard → three-dot menu.
- Translation checks: identical key sets in uz/ru/en; every statically referenced key exists.

## Build results

- `npm run build` (frontend): success (Vite 7). Vendor chunks split (react / map / i18n); main chunk ≈ 530 kB minified (size warning only).

## Bugs found and fixed during testing

- Blank page caused by an expression-bodied `useEffect` returning a value (ScrollToTop, SearchBar).
- After registration the “already logged in” guard redirected home instead of to language selection.
- i18next reserved option `lng` used as an interpolation variable crashed the map step.
- Dev rate limits too strict for repeated local testing (production limits unchanged).
- Vite picked up an unrelated `postcss.config.js` from a parent folder → pinned inline PostCSS config.
- Added a page-level error boundary so a render error never blanks the whole app.

## Update — personalised homepage

- Guests (first visit) keep the full marketing homepage: large hero, search block, category cards, "How it works", owner promotion.
- Signed-in users get a compact personal homepage: small greeting banner with quick actions, live counters (new incoming requests, awaiting reply, upcoming, active listings) from the API, verification reminder when not verified, compact category chips, then featured items and category rows ("How it works" hidden).
- Fixed: the header "Rent out" button was visible on phones (Tailwind `hidden` vs `inline-flex` order) — now `max-sm:hidden`.
- Verified in Chrome (desktop 1440 px and mobile 390 px): no console errors, 0 px horizontal overflow.

## Update — MongoDB Atlas & demo cleanup

- MongoDB Atlas connected (`/api/health` → `"mode": "atlas"`); categories and demo data seeded into Atlas; register/login verified against Atlas.
- `npm run demo:clear` (dry run) / `npm run demo:clear -- --yes` removes demo users, listings and every linked booking, favourite, notification and verification; categories and real data are kept. Demo data is **kept for now** for the hackathon presentation.
- Login page shows the demo-account hint only while demo accounts exist (`demoAccounts` flag in `/api/health`).
- New test `demo-clear.test.js`: **33/33 tests pass**.

## Update — deployed

- Frontend live on Vercel: https://my-project-spj3.vercel.app
- Backend live on Render: https://kerakbolsa-api.onrender.com (`/api/health` → `"mode": "atlas"`)
- Verified on the live site: pages and client routes (incl. refresh), API through the Vercel proxy, demo photos and hero images (0 broken images), demo login with a Secure httpOnly cookie, personal homepage, product page — no console errors.
- Fixes for deployment: hero/login images served from the frontend; Render blueprint; `mongodb-memory-server` moved to devDependencies; placeholder Cloudinary values (`none`) treated as not configured.

## Known problems / limitations

- Cloudinary not configured — user uploads are stored on the server disk (lost when the free Render instance restarts).
- Identity verification is simulated (clearly labelled DEMO).
- No online payment, reviews or chat (out of MVP scope).

## Remaining tasks / ideas

- Connect Atlas and Cloudinary; deploy (Render + Vercel).
- Real KYC provider integration, email notifications, reviews after completed rentals, calendar date-picker with disabled booked days, image resizing on upload.
