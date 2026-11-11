# RentCore — Local-First Windows Operator Runbook

This guide is for **operators and business users** running RentCore on a **Windows PC**. You do not need to read the application source code to follow it.

Technical contributors should work from the `rental-erp` folder (for example `d:\MT-ERP\rental-erp`).

---

## 1. What RentCore Is

RentCore is rental operations software (customers, orders, inventory, dispatch, billing, accounting, and related workflows).

For current operation:

- RentCore runs **on your computer** (local application + local database).
- Business data is stored in **PostgreSQL on the same machine** (or reachable at `127.0.0.1`).
- **Cloud hosting is not required** for day-to-day use.
- Cloud deployment is planned as a **later phase**; it is out of scope for this runbook.

---

## 2. Requirements

Verified from the repository (`package.json`, `.env.example`, Docker docs):

| Requirement | Details |
| ------------- | -------- |
| Operating system | **Windows** (this runbook) |
| Node.js | **22.x** (`package.json` `engines.node`) |
| npm | Included with Node.js |
| PostgreSQL | **16** recommended (matches Docker dev image `postgres:16-alpine`) |
| Network ports | **3000** (RentCore web app), **5432** (local business database), **5433** (QA database only if you use it) |
| Disk | Space for PostgreSQL data, Node dependencies, optional `./uploads`, and `./backups` (or your chosen `BACKUP_DIR`) |

PostgreSQL client tools **`pg_dump`** and **`psql`** must be on your PATH to run backup/restore scripts.

Docker is **optional** (developer convenience). It is **not** required for customer operation on Windows.

---

## 3. Database Setup — Read This First

Two PostgreSQL targets are used in this project. **Do not confuse them.**

### BUSINESS / LOCAL DATABASE (normal operation)

```text
Host:     127.0.0.1
Port:     5432
Database: rental_erp
```

Use this for **real local business work**. Your application `.env` should point here unless your installer explicitly configured otherwise.

### QA DATABASE (testing only)

```text
Host:     127.0.0.1
Port:     5433
Database: rental_erp_qa
```

Use this **only** for testing or QA. **Do not** point day-to-day customer operation at this database by casually editing `.env`.

| Environment | Host | Port | Database | Purpose |
| ------------- | ---- | ---: | -------- | ---------------------- |
| Local business | 127.0.0.1 | 5432 | `rental_erp` | Actual local operation |
| QA | 127.0.0.1 | 5433 | `rental_erp_qa` | Testing only |

### Safety rules (mandatory)

**Do not:**

- run `prisma migrate reset`
- drop either database
- delete business data to “fix” problems
- restore a backup **onto** `rental_erp` unless you fully understand that it **overwrites** current data
- switch `.env` from port **5432** to **5433** without a clear, documented reason

If PostgreSQL is newly installed, create the empty database `rental_erp` (and users/permissions) using your PostgreSQL tools before running migrations. Use credentials that match your `.env` — **never put real passwords in this document**.

---

## 4. Environment Configuration

1. In the `rental-erp` folder, copy the template:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` with a text editor. Important variables:

| Variable | Purpose |
| -------- | -------- |
| `APP_ENV` | Use `local` for normal local operation (see `.env.example`) |
| `APP_URL` | Application URL, typically `http://localhost:3000` |
| `BETTER_AUTH_URL` | Must match how you open the app in the browser (typically same as `APP_URL`) |
| `DATABASE_URL` | PostgreSQL connection string — must target **`rental_erp` on port 5432** for business use |
| `BETTER_AUTH_SECRET` | Secret for sessions (minimum 32 characters; generate a new random value — see comment in `.env.example`) |

Optional (see `docs/production/ENVIRONMENT_VARIABLES.md`):

- `BACKUP_DIR` (default `./backups`)
- `BACKUP_RETENTION_DAYS` (default `14` for **automatic pruning of old backup files** when the backup script runs)
- `UPLOAD_STORAGE=local`, `UPLOAD_PATH=./uploads`

**Never commit `.env` or share it.** Do not paste secrets into tickets or email.

Full catalog: [ENVIRONMENT_VARIABLES.md](../production/ENVIRONMENT_VARIABLES.md).

---

## 5. Database Migration (Safe vs Dangerous)

All commands below are run from the `rental-erp` folder in **PowerShell** or **Command Prompt**, after `.env` exists.

### Safe — check status

```powershell
npm run db:status
```

Shows whether migrations are pending. Target database is whatever `DATABASE_URL` in `.env` points to. **Confirm it is `rental_erp` on 5432 before proceeding.**

### Safe — apply pending migrations (shared / operator style)

```powershell
npm run db:migrate:deploy
```

Uses `prisma migrate deploy` — applies committed migrations without reset.

### Safe — optional seed (fresh database)

On a **new empty** database, seeding loads baseline reference data (roles, accounts, etc.):

```powershell
npm run db:seed
```

If `npm run create:admin` fails with a message about roles, run seed first (see script message).

### Developer-only (not for casual operator use)

```powershell
npm run db:migrate
```

This runs `prisma migrate dev` and is intended for developers.

### Dangerous — do not use on business data

| Command / action | Why |
| ---------------- | --- |
| `prisma migrate reset` | **Wipes data** |
| Dropping `rental_erp` | **Destroys business data** |
| Restore script aimed at `rental_erp` without a backup plan | **Overwrites live data** |

See also: [runbooks/MIGRATIONS.md](../production/runbooks/MIGRATIONS.md).

---

## 6. First Administrator Account

Public sign-up is **disabled**. Create the first user with:

```powershell
npm run create:admin
```

**Interactive prompts (default):**

1. `Name`
2. `Email`
3. `Password (min 8 chars)`
4. `Role [owner]:` — press Enter for **owner**, or choose: owner, manager, worker, accountant, viewer

If an administrator with that email already exists, the command reports that and exits without changes.

**Non-interactive mode** (optional): set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROLE` in the environment before running the command. Do not store these values in documentation.

Do not bypass Better Auth or disable security to fix login issues.

---

## 7. Starting RentCore

### First-time setup (summary)

```powershell
cd path\to\rental-erp
npm install
# .env configured, PostgreSQL running, database rental_erp exists
npm run db:status
npm run db:migrate:deploy
npm run db:seed          # if fresh database / if admin creation requires roles
npm run create:admin     # once
```

### Daily development startup

```powershell
npm run dev
```

Open: **http://localhost:3000**

### Production-style local startup (after build)

```powershell
npm run build
npm run start
```

Still uses port **3000** by default unless you configure Next.js otherwise.

### Verify the application is running

| Check | URL | Expected |
| ----- | --- | -------- |
| Liveness (app process) | http://localhost:3000/api/health | JSON with `"status":"ok"` |
| Readiness (includes database) | http://localhost:3000/api/health/ready | JSON with `"status":"ready"` when DB and config are OK |

You can also open http://localhost:3000 in a browser and reach the login page.

---

## 8. Stopping RentCore

### Stop the application

- In the terminal where `npm run dev` or `npm run start` is running, press **Ctrl+C** once and wait for the process to exit.

Do not use Task Manager to kill random processes.

### Stop PostgreSQL (only if you manage it manually)

- Open **Services** (`services.msc`), find your PostgreSQL service (name varies by installer, e.g. `postgresql-x64-16`), and **Stop** only that service.
- If PostgreSQL is shared with other software, leave it running and stop only RentCore.

---

## 9. Daily Customer Operation

Supported workflow on Windows:

1. **Start PostgreSQL** (if it is not set to start automatically).
2. **Start RentCore** — `npm run dev` (or `npm run start` after a build).
3. **Open a browser** — Chrome, Edge, or Firefox.
4. Go to **http://localhost:3000**
5. **Sign in** with your administrator or user account.
6. **Use RentCore** for daily operations.
7. **Back up business data** on a schedule your business defines (see §10). Store copies **off the same PC** when possible.
8. **Stop the application** (Ctrl+C) when finished, if you prefer not to leave it running.

---

## 10. Backup on Windows

### Prefer PowerShell (Windows-native)

The npm script `npm run db:backup` calls **`scripts/db/backup.sh`** (bash). On Windows, use:

```powershell
cd path\to\rental-erp
# Set DATABASE_URL in this window to match your .env (do not share the value)
$env:DATABASE_URL = "postgresql://..."   # same as .env
# Optional:
# $env:BACKUP_DIR = "D:\Backups\RentCore"
# $env:BACKUP_RETENTION_DAYS = "14"
.\scripts\db\backup.ps1
```

**Requirements:** `pg_dump` on PATH; `DATABASE_URL` set in the session (the script does **not** read `.env` automatically).

**What is backed up:** the entire PostgreSQL database referenced by `DATABASE_URL` (typically `rental_erp`).

**Where files go:** default folder `./backups` under `rental-erp`, or `BACKUP_DIR` if set.

**How to identify a backup:** filename pattern `rental-erp_YYYYMMDDTHHMMSSZ.sql.gz` or `.sql.zip` if gzip is not available.

**Retention:** when the script runs, it can delete backup files older than `BACKUP_RETENTION_DAYS` (default **14** days per `.env.example` and `ENVIRONMENT_VARIABLES.md`). That is **file** retention, not a defined **business schedule** for how often you must run backups.

> **How often to run backups:** Retention policy not yet defined for operator schedules. Define daily/weekly backup practice with your business owner.

**Best practice:** copy backup files to external drive or network storage — not only the same computer.

More detail: [runbooks/BACKUP.md](../production/runbooks/BACKUP.md).

**This runbook does not execute a backup.** Run the script when your procedure requires it.

---

## 11. Restore (Test Only — Not Verified End-to-End)

Restore scripts exist:

- Windows: `scripts/db/restore.ps1`
- Bash: `scripts/db/restore.sh`

**Limitation:** A full restore drill on a disposable test database has **not** been performed and verified as part of local-first readiness work.

**Never restore into `rental_erp` on port 5432** unless you intend to **replace** all current business data and you have a current backup of what you are overwriting.

**Planned test-only procedure (future):**

1. Create a **separate empty** database (not `rental_erp`).
2. Point `DATABASE_URL` **only in a test session** at that database.
3. Run `.\scripts\db\restore.ps1` with a specific backup file path.
4. Validate with `npm run db:status` and read-only checks.
5. Do **not** point production `.env` at the test database.

The restore script waits 5 seconds before proceeding — use that window to abort (Ctrl+C) if the target is wrong.

---

## 12. Cloud Separation

**Cloud deployment is not required for current local operation.**

Render, managed cloud PostgreSQL, and production cutover guides live under `docs/production/`. Use those only when your organization begins a **cloud phase** — not for normal Windows desk operation.

For local work, start with **this runbook** and [LOCAL-FIRST-READINESS-AUDIT.md](../../LOCAL-FIRST-READINESS-AUDIT.md) (audit snapshot).

---

## 13. Troubleshooting

### Application will not start

1. **Node version** — run `node -v`; must satisfy **22.x** (`package.json`).
2. **Dependencies** — from `rental-erp`: `npm install`.
3. **`.env`** — file exists; `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, `BETTER_AUTH_URL` set.
4. **PostgreSQL** — service running; database `rental_erp` reachable on **5432**.
5. **Port 3000** — not in use by another app (see below).

### Database connection failure

1. PostgreSQL service running.
2. Host `127.0.0.1`, port **5432**, database name **`rental_erp`** match `DATABASE_URL`.
3. Run `npm run db:status` with the same `.env`.
4. Open http://localhost:3000/api/health/ready — inspect `"status"` and checks (no secrets shown).

### Login failure

1. RentCore running at **http://localhost:3000** (same as `APP_URL` / `BETTER_AUTH_URL`).
2. Use an account created via `npm run create:admin` (sign-up is disabled).
3. Do not weaken authentication settings to bypass errors.

### Port 3000 already in use

1. Find the process:

   ```powershell
   netstat -ano | findstr :3000
   ```

2. Note the PID in the last column. Identify it:

   ```powershell
   tasklist /FI "PID eq <PID>"
   ```

3. If it is a **`node.exe`** session from a previous RentCore run, close that terminal or stop that specific process from Task Manager.
4. Do **not** end unrelated system processes.

---

## 14. Related Documentation

| Document | Audience |
| -------- | -------- |
| [ENVIRONMENT_VARIABLES.md](../production/ENVIRONMENT_VARIABLES.md) | Full env catalog |
| [runbooks/BACKUP.md](../production/runbooks/BACKUP.md) | Backup procedures |
| [runbooks/MIGRATIONS.md](../production/runbooks/MIGRATIONS.md) | Migration deploy |
| [DOCKER.md](../production/DOCKER.md) | Optional Docker dev stack |
| [LOCAL-FIRST-READINESS-AUDIT.md](../../LOCAL-FIRST-READINESS-AUDIT.md) | Readiness audit |

---

*Runbook version aligned with repository audit baseline (2026-10-02). Commands refer to `package.json` scripts in `rental-erp`.*
