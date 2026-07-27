# First Run Setup

Production and fresh local environments use the same bootstrap flow. Follow these steps after cloning the repository.

## Prerequisites

- Node.js 22+
- PostgreSQL database
- Environment file configured (copy `.env.example` to `.env` if needed)

Required variables include at minimum:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (e.g. `http://localhost:3000` for local dev)

## 1. Install

```bash
cd rental-erp
npm install
```

## 2. Migrate

Apply the baseline schema to an empty database:

```bash
npx prisma migrate deploy
```

Verify migration status:

```bash
npx prisma migrate status
```

## 3. Seed

Load essential reference data (roles, units of measure, expense categories):

```bash
npx prisma db seed
```

This command is idempotent. Re-running it skips rows that already exist.

Seeded data:

| Dataset | Records |
| --- | --- |
| Roles | `owner`, `manager`, `worker`, `accountant`, `viewer` |
| Units of measure | `PCS`, `SET`, `DAY` |
| Expense categories | Fuel, Labour, Vehicle Maintenance, Repair, Office, Purchase, Utility, Transport, Miscellaneous |

The seed does **not** create customers, products, suppliers, inventory, orders, branding, or demo data.

## 4. Create Admin

Create the first administrator interactively (no hardcoded credentials):

```bash
npm run create:admin
```

You will be prompted for:

- Name
- Email
- Password (minimum 8 characters)
- Role (defaults to `owner`)

The command:

1. Validates duplicate email addresses (ERP and Better Auth)
2. Creates the ERP `users` record
3. Creates the Better Auth `user` and `account` (credential provider)
4. Links both via `erpUserId` / `authUserId`

Sign-up remains disabled in the application (`disableSignUp: true`). New users must be provisioned through this CLI or the identity admin API.

## 5. Start Server

Development:

```bash
npm run dev
```

Production (after build):

```bash
npm run build
npm run start
```

## 6. First Login

1. Open the application URL (local default: [http://localhost:3000](http://localhost:3000))
2. Sign in with the email and password from `npm run create:admin`
3. Complete company branding and operational settings under **Settings** when ready

### Company settings bootstrap

You do **not** need to visit Settings before creating customers, products, or other coded entities. On first use, the application automatically creates default `company_settings` (and `system_settings` when loading settings) using built-in bootstrap values.

Document numbers are allocated only after company settings exist; this happens transparently on the first document creation.

## Quick reference

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run create:admin
npm run dev
```

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `Role not found` during `create:admin` | Run `npx prisma db seed` |
| `Email already exists` | Use a different email or remove the existing user |
| `DATABASE_URL is required` | Set `DATABASE_URL` in `.env` |
| Migration errors on non-empty DB | See migration recovery docs; do not edit `0_baseline` |
