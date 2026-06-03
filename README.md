# Ayende Quote & Invoice Platform

Single-user internal tool for **Ayende Consulting Inc.** to create branded quotes,
convert them into invoices, track payments, manage clients, and view reporting —
producing polished KSQ-styled PDFs.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · Prisma + Postgres
(Neon free tier) · simple single-admin auth · deploys to Vercel.

---

## Phase 1 (this drop) — what's included

- Project scaffold (Next.js App Router + TypeScript + Tailwind v4)
- Full Prisma schema for **all** phases (clients, quotes, sections/line items,
  invoices, payments, business profile, document numbering counter)
- Single-admin authentication (signed session cookie + route-protecting middleware)
- Login / logout flow
- Sidebar dashboard shell (Option A) with Dashboard, Clients, Quotes, Invoices,
  Payments, Reports, Settings
- Dashboard with metric cards (placeholder values) + quick actions
- Helper libraries: money/tax/discount math, document-number generator
- Seed script for the business profile

> The dashboard runs **without a database** so you can see the shell immediately.
> A database is only needed once Clients/Quotes land (Phase 2+).

---

## Quick start

```bash
npm install
cp .env.example .env        # then fill in the values

# Set your admin password (prints a hash to paste into .env)
npm run hash -- "your-password"
# paste the printed hash into ADMIN_PASSWORD_HASH, and set ADMIN_EMAIL + SESSION_SECRET

npm run dev                 # http://localhost:3000
```

You can log in and explore the shell right away. To enable the database later:

```bash
# Set DATABASE_URL in .env (Neon connection string), then:
npm run db:push             # create tables
npm run db:seed             # create the Ayende Consulting profile row
```

### Generating SESSION_SECRET

Any long random string works, e.g.:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add a Postgres database (Neon via the Vercel Marketplace is free).
4. Set env vars in Vercel: `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`,
   `SESSION_SECRET`, `APP_BASE_URL`.
5. Run `npm run db:push` against the production database once (locally with the
   prod `DATABASE_URL`, or via a one-off script).

> Note: Vercel's free **Hobby** plan is licensed for non-commercial use. Per their
> terms a business tool should be on **Pro** ($20/mo). Railway (~$5/mo) is the
> cheapest fully-compliant alternative and runs the app + Postgres together.

---

## Roadmap

1. **Foundation** — scaffold, schema, auth, sidebar shell ✅ *(this drop)*
2. Clients + Settings (business profile)
3. Quote builder + both templates + tax/numbering/discount engine
4. KSQ-styled PDF rendering
5. Sharing + acceptance (public link e-sign + manual)
6. Quote → Invoice conversion + invoice management
7. Payments tracking
8. Reporting dashboard + CSV/XLSX export
9. Polish, seed data, deploy
