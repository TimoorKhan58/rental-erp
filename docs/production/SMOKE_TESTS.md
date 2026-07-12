# Production Smoke Test Checklist — Phase 8-010

Execute after deploy or rollback against the target environment (staging dress rehearsal, then production).  
Sign in as an admin (or role with required permissions). Record pass/fail and notes.

**Environment:** _____________ **Build/tag:** _____________ **Tester:** _____________ **Date:** _____________

---

## Platform

| # | Area | Steps | Expected outcome | ☐ |
|---|------|-------|------------------|---|
| P1 | API health | `GET /api/health` and `/api/health/live` | `200`, `status: ok` | |
| P2 | API readiness | `GET /api/health/ready` | `200`, DB/prisma/config OK | |
| P3 | API startup | `GET /api/health/startup` | `200`, started | |
| P4 | Metrics | `GET /api/metrics` (bearer if set) | `200` Prometheus text **or** `401/404` if disabled/protected as configured | |
| P5 | HTTPS | Open public `APP_URL` | Valid cert; no mixed-content blocks | |
| P6 | Security headers | `curl -sI https://host/` | CSP, HSTS (HTTPS), `X-Frame-Options`, COOP present | |

---

## Authentication

| # | Area | Steps | Expected outcome | ☐ |
|---|------|-------|------------------|---|
| A1 | Login | Sign in with valid credentials | Redirect to app home/dashboard | |
| A2 | Session | Refresh page | Remain authenticated | |
| A3 | Unauthorized | Open protected route logged out | Redirect to `/login` | |
| A4 | Logout | Sign out | Session cleared; login required again | |
| A5 | Bad password | Attempt invalid login | Error; no session (rate limit may apply after repeats) | |

---

## Business modules

| # | Module | Steps | Expected outcome | ☐ |
|---|--------|-------|------------------|---|
| B1 | Dashboard | Open dashboard | Widgets/metrics load without error | |
| B2 | Customers | List → open detail (or create if empty) | List/detail render; create saves if permitted | |
| B3 | Suppliers | List → detail/create | Same as customers | |
| B4 | Warehouses | List → detail/create | Same | |
| B5 | Products | List → detail; verify catalog fields | Product data loads | |
| B6 | Inventory | List stock; filter by warehouse if available | Quantities display | |
| B7 | Procurement | Open POs list; open one PO | Status and lines visible | |
| B8 | Rental Orders | List → open order → confirm UI actions available per status | Order detail consistent | |
| B9 | Dispatch | Open dispatches list/detail | Linked to rental order as designed | |
| B10 | Returns | Open returns list/detail | Inspection fields visible when applicable | |
| B11 | Repair | Open repairs list/detail | Status workflow controls visible per permissions | |
| B12 | Maintenance | Open maintenances list/detail | Scheduled/complete actions per status | |
| B13 | Invoices | Open rental invoices list/detail | Totals and status correct | |
| B14 | Payments | Open payments list/detail | Linked invoice/customer shown | |
| B15 | Accounting | Accounts list + one journal (or trial balance) | Reports/pages load | |
| B16 | Reports | Open Reports hub + one financial report | Charts/tables render | |
| B17 | Audit | Open audit list → one detail | Request ID / actor visible | |
| B18 | Notifications | Open notification center/list | Items load; mark read if present | |
| B19 | Settings | Open company/profile/preferences | Values load; save preference succeeds | |

---

## Minimal go/no-go set (production window)

If time-boxed, **must pass**: P1, P2, P5, A1, A2, B1, B8, B13, B17, B19.

---

## Sign-off

| Role | Name | Result | Signature/date |
|------|------|--------|----------------|
| QA / Ops | | Pass / Fail | |
| Product | | Go / No-Go | |
