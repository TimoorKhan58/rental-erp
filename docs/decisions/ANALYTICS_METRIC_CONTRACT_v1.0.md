# Phase 24.1.1 — Analytics Metric Contract & Semantic Freeze

**Document:** Analytics Metric Contract v1.0  
**Status:** SEMANTICS FROZEN — READY FOR IMPLEMENTATION  
**Date:** 2026-08-10  
**Freeze addendum:** Phase 24.1.1-C (BD-1–BD-9 approved baseline)  
**Scope:** Semantic contracts only. No implementation in this document’s authoring phases.  
**Architecture decision (approved):** Extend `reporting` / `financial-report`; do not create a greenfield `analytics` module.

---

## How to read this contract

| Layer | Meaning |
| ----- | ------- |
| **CURRENT PRODUCTION BEHAVIOR** | What existing APIs/dashboard/reports do today — must not be silently changed |
| **FROZEN ANALYTICS SEMANTICS** | Approved Phase 24 definitions for new qualified analytics metrics |
| **FUTURE CAPABILITY GAPS** | Known limitations; do not invent data or misleading KPIs |

Historical decision-sheet material from Phase 24.1.1-B is preserved under **Appendix A**.

---

## 1. Executive Summary

Phase 24 analytics semantics are **frozen** under the approved BD-1 through BD-9 baseline.

- Never expose a bare KPI named only **Revenue**.
- Use qualified money terms: Booked Rental Value, Billed Revenue, Collected Cash, Recognized Revenue.
- Active Rental = CONFIRMED + RESERVED (booking/operational; **not** physically on rent).
- Physically rented quantity and physical on-rent tracking remain **capability gaps**.
- New analytics metrics must not mutate existing `/api/reports/*` or dashboard calculations without a separate migration task.

```text
Analytics Metric Contract Status:
SEMANTICS FROZEN — READY FOR IMPLEMENTATION
```

Do **not** start Phase 24.1.2 until explicitly approved.

---

## 2. Repository Verification (historical evidence)

Verified directly from source (Phase 24.1.1):

| Area | Evidence |
| ---- | -------- |
| Rental statuses | `RENTAL_ORDER_STATUSES` in `src/modules/rental-order/domain/rental-order.constants.ts` |
| Invoice statuses | `RENTAL_INVOICE_STATUSES` in `src/modules/rental-invoice/domain/rental-invoice.constants.ts` |
| Payment statuses | `PAYMENT_STATUSES` in `src/modules/payment/domain/payment.constants.ts` |
| Invoice totals / balance | `computeInvoiceTotals` in `src/modules/rental-invoice/domain/rental-invoice.rules.ts` |
| Order line / order totals | `computeLineTotal`, `computeOrderSubtotal`, persistence `buildPersistenceTotals` |
| `bookingDate` write | `toRentalOrderCreateInput` / update mappers set `bookingDate = envelope.startDate` |
| Dashboard revenue MTD | Invoice `grandTotal`, statuses ISSUED\|PARTIALLY_PAID\|PAID, `invoiceDate` UTC month |
| Dashboard cash MTD | Payment `amount`, status POSTED, `paymentDate` UTC month |
| Dashboard “active” UI | `confirmedOrders + reservedOrders` |
| List “activeOrders” | `orders.length - cancelledCount` |
| AR aging | `buildArAgingBuckets` / `calculateDaysPastDue` |
| Inventory math | available = onHand − reserved; utilization = reserved/onHand |
| Procurement (existing report) | qty × unitCost by `orderDate`; CANCELLED included unless filtered |
| Recognized revenue | Posted journals, INCOME accounts, `journalDate` |
| Complete dispatch | RELEASE + OUT; does **not** update rental order status |
| DISPATCHED / ON_RENT writers | **Not found** on `RentalOrder` |
| Period helpers | UTC inclusive `inDateRange` / month bounds |

---

## 3. Frozen Revenue Vocabulary

**Rule:** Never expose an ambiguous generic metric named simply `Revenue` in Phase 24 analytics APIs, DTOs, or primary UI labels.

### Booked Rental Value — APPROVED / FROZEN (BD-1)

| Attribute | FROZEN ANALYTICS SEMANTICS |
| --------- | -------------------------- |
| Meaning | Commercial value of rental orders attributed to a period |
| Source | `RentalOrder.grandTotal` |
| Date | `bookingDate` |
| `bookingDate` meaning | **Event-start envelope** (same as event start on write). **Not** order-placement / `createdAt` |
| Excluded statuses | `DRAFT`, `CANCELLED` |
| Included statuses | All other rental order statuses (CONFIRMED, RESERVED, DISPATCHED, ON_RENT, PARTIALLY_RETURNED, RETURNED, COMPLETED) |
| Rounding | `roundMoney` (2 dp) |
| Product-line alternate | `RentalOrderItem.lineTotal` for product analytics, with same order status/date filters |

**CURRENT PRODUCTION BEHAVIOR:** `/api/reports/rentals` and customer report “revenue” may still sum orders **without** excluding DRAFT/CANCELLED by default.

**Compatibility:** Booked Rental Value is a **new qualified analytics metric**. Do **not** silently change existing report `totalRevenue` / customer `revenue` fields.

### Billed Revenue — APPROVED / FROZEN

| Attribute | FROZEN ANALYTICS SEMANTICS |
| --------- | -------------------------- |
| Source | `RentalInvoice.grandTotal` |
| Date | `invoiceDate` |
| Included | `ISSUED`, `PARTIALLY_PAID`, `PAID` |
| Excluded | `DRAFT`, `VOID` |
| Formula of grandTotal | `roundMoney(subtotal - discount + tax)` |

Aligns with dashboard MTD billed aggregate.

### Collected Cash — APPROVED / FROZEN

| Attribute | FROZEN ANALYTICS SEMANTICS |
| --------- | -------------------------- |
| Source | `Payment.amount` |
| Date | `paymentDate` |
| Included | `POSTED` only |
| Excluded | `PENDING`, `VOID` |

### Recognized Revenue — APPROVED / FROZEN

| Attribute | FROZEN ANALYTICS SEMANTICS |
| --------- | -------------------------- |
| Source | Posted GL income (`accountType === "INCOME"`) |
| Date | `JournalEntry.journalDate` |
| Journal status | `POSTED` only |
| Implementation | Consume `financial-report` — **do not duplicate** in operational reporting |

---

## 4. Frozen Rental Lifecycle Semantics

### Status catalog (enum)

`DRAFT` → `CONFIRMED` → `RESERVED` → (`DISPATCHED`, `ON_RENT`) → `PARTIALLY_RETURNED` / `RETURNED` → `COMPLETED` · also `CANCELLED`

**CURRENT PRODUCTION BEHAVIOR:** DISPATCHED / ON_RENT lack verified writers on `RentalOrder`. Dispatch completion updates stock only.

### Active Rental — APPROVED / FROZEN (BD-2)

```text
Active Rental = status IN { CONFIRMED, RESERVED }
```

| Attribute | Contract |
| --------- | -------- |
| Meaning | Booking / operational pipeline active |
| Not claiming | Inventory is physically on rent |
| Aligns with | Current dashboard pulse counters |

**Do not** define Active Rental as physical on-rent.  
**Do not** create a physical-rental calculation in Phase 24.1.x foundation.

**CURRENT PRODUCTION BEHAVIOR:** Dashboard already uses CONFIRMED + RESERVED. List page `activeOrders` (= non-CANCELLED) is a **different** UI concept — leave unchanged unless a separate migration is approved.

### Physically On Rent — FUTURE CAPABILITY GAP

```text
Physically On Rent
```

Future concept requiring reliable dispatch/return lifecycle data (and/or stock movement netting). **Not** an analytics KPI in this contract freeze.

### Upcoming Rental — APPROVED / FROZEN (BD-3)

```text
Upcoming Rental =
  eventStartDate ∈ [UTC startOfToday, UTC startOfToday + 14 days] (inclusive)
  AND status IN { CONFIRMED, RESERVED }
```

| Excluded | `DRAFT`, `CANCELLED`, `COMPLETED` |
| Horizon | **14 days** — approved business rule |
| Date field | `eventStartDate` (not `bookingDate` as “created”) |

### Completed Rental — APPROVED / FROZEN

```text
status === COMPLETED
```

### Cancelled Rental — APPROVED / FROZEN

```text
status === CANCELLED
```

### Overdue Rental — APPROVED / FROZEN (BD-4)

```text
expectedReturnDate < UTC startOfToday
AND status NOT IN { COMPLETED, CANCELLED, DRAFT }
```

| Attribute | Contract |
| --------- | -------- |
| Meaning | Expected-return overdue by lifecycle status |
| May include | RESERVED orders never dispatched — **acceptable** for initial analytics |
| Not claiming | Physically overdue equipment in the field |

Until physical dispatch/return tracking is reliable, do **not** reinterpret as “physically overdue equipment.”

---

## 5. Frozen Financial Metrics

### Outstanding Invoice Balance (Outstanding AR) — APPROVED / FROZEN

| Attribute | Contract |
| --------- | -------- |
| Source | `RentalInvoice.balance` |
| Formula | `balance = roundMoney(grandTotal - paidAmount)` |
| Included | `ISSUED`, `PARTIALLY_PAID` |
| Excluded | `DRAFT`, `PAID`, `VOID` |
| Zero/negative | Skip `balance <= 0` (AR aging) |

### Overdue Invoice Amount — APPROVED / FROZEN

Reuse AR aging: population ISSUED|PARTIALLY_PAID with `balance > 0`; anchor `dueDate ?? invoiceDate`; overdue = sum of buckets `d1_30` + `d31_60` + `d61_90` + `d90_plus`.

### Paid Invoice Amount — APPROVED / FROZEN (BD-5)

```text
NO canonical analytics KPI named "Paid Invoice Amount"
```

Use instead:

- **Collected Cash** (period cash from POSTED payments)
- **Outstanding AR** (open invoice balances)

**Why:** `paidAmount` stock, `grandTotal` of PAID invoices, and POSTED payment sums are **not equivalent**. A third “Paid Invoice Amount” KPI duplicates or confuses Collected Cash.

Optional future stock field (if ever needed) must be named distinctly (e.g. `invoicePaidToDate`) — **not** Collected Cash.

---

## 6. Frozen Inventory Metrics

**Hard rule:** `Asset` ≠ rental `Inventory`. Never merge.

| Metric | Status | Definition |
| ------ | ------ | ---------- |
| Total Products | FROZEN | `count(Product)` where `isActive = true` |
| Available Inventory | FROZEN | `sum(max(0, quantityOnHand - reservedQuantity))` active inventory |
| Reserved Inventory | FROZEN | `sum(reservedQuantity)` active inventory |
| Inventory Utilization | FROZEN | `(reserved / onHand) * 100` when onHand > 0 else 0 |
| Low Stock | FROZEN | `quantityOnHand <= minimumStock` |
| Overstock | FROZEN | `maximumStock != null && quantityOnHand > maximumStock` |
| Inventory Value | FROZEN | `sum(quantityOnHand * purchaseCost)` rounded |

### Rented Inventory Quantity — APPROVED / FROZEN DEFERRAL (BD-6)

```text
NO CANONICAL PHYSICALLY RENTED QUANTITY KPI YET
```

**Reason:** `reservedQuantity ≠ physically out quantity` (dispatch RELEASE + OUT). Exposing “Rented Inventory Quantity” would mislead.

**Use instead:** Reserved Quantity, Available Quantity.

**Classification:** **CAPABILITY GAP** — future work may use stock movement / dispatch / return semantics. **No schema change in this phase.**

---

## 7. Frozen Customer Metrics

### New Customer — APPROVED / FROZEN (BD-8)

```text
New Customer =
  Customer.createdAt within selected UTC period (inclusive bounds)
  AND isActive = true
```

| Attribute | Contract |
| --------- | -------- |
| Canonical date | `createdAt` |
| Period | UTC |
| Active filter | Part of analytics definition |

Do not change customer domain behavior.

| Also | |
| ---- | -- |
| Total Customers | `isActive = true` count |
| Customer Growth | Derived from New Customers period-over-period |
| Top / frequency | Prefer Booked Rental Value (BD-1 filters) for analytics; existing customer report may differ |

---

## 8. Frozen Supplier / Procurement Metrics

### Ordered Procurement Value — APPROVED / FROZEN (BD-9)

```text
Ordered Procurement Value =
  sum(PurchaseOrderItem.quantity × PurchaseOrderItem.unitCost)
```

| Date | `PurchaseOrder.orderDate` |
| Excluded PO statuses | `DRAFT`, `CANCELLED` |
| Included | `APPROVED`, `PARTIALLY_RECEIVED`, `RECEIVED` |

**CURRENT PRODUCTION BEHAVIOR:** `/api/reports/procurement` (and related) may include CANCELLED — **preserve**.

**Compatibility:** Ordered Procurement Value is a **new qualified analytics metric**. Do not mutate existing procurement report defaults in Phase 24.1.x without a separate migration.

**Not equivalent (future / separate):**

- Received Procurement Value — **CAPABILITY GAP** until receive semantics are authoritative  
- Supplier Spend — POSTED `SupplierPayment` (or equivalent); separate KPI if introduced  

---

## 9. Frozen Maintenance Semantics (BD-7)

**Do not** use a single ambiguous metric named only `Maintenance`.

### Asset Under Maintenance — APPROVED / FROZEN

```text
Asset.status === UNDER_MAINTENANCE
```

### Rental Maintenance / Repair Jobs — APPROVED / FROZEN

Based on existing Maintenance / Repair job models (e.g. open SCHEDULED|IN_PROGRESS maintenance; pending/in-progress repairs as used by ops reporting).

These are **different** business concepts. **Do not merge** into one number.

**CURRENT PRODUCTION BEHAVIOR:** Dashboard pulse may label combined repair+maintenance job counts as “assets” — leave unchanged until a separate UI migration renames copy.

---

## 10. Frozen Date Dictionary

| Metric | Canonical Date |
| ------ | -------------- |
| Booked Rental Value | `bookingDate` (event-start envelope — **not** order creation) |
| Billed Revenue | `invoiceDate` |
| Collected Cash | `paymentDate` |
| Recognized Revenue | `journalDate` |
| Upcoming Rental | `eventStartDate` |
| Overdue Rental | `expectedReturnDate` |
| New Customer | `createdAt` |
| Ordered Procurement Value | `orderDate` |
| Completed Rental (count) | status-based (`COMPLETED`); not `actualReturnDate` |

All analytics period boundaries use **UTC** semantics (`inDateRange` inclusive; month helpers UTC), consistent with existing reporting helpers.

---

## 11. Frozen Status Dictionary

| Metric | Included | Excluded |
| ------ | -------- | -------- |
| Booked Rental Value | All except below | DRAFT, CANCELLED |
| Active Rental | CONFIRMED, RESERVED | all others |
| Upcoming Rental | CONFIRMED, RESERVED | DRAFT, CANCELLED, COMPLETED (+ others by implication) |
| Overdue Rental | Any status not excluded | COMPLETED, CANCELLED, DRAFT |
| Completed Rental | COMPLETED | others |
| Billed Revenue | ISSUED, PARTIALLY_PAID, PAID | DRAFT, VOID |
| Outstanding AR | ISSUED, PARTIALLY_PAID | DRAFT, PAID, VOID |
| Collected Cash | POSTED | PENDING, VOID |
| Recognized Revenue | Journal POSTED + INCOME | non-posted / non-INCOME |
| Ordered Procurement Value | APPROVED, PARTIALLY_RECEIVED, RECEIVED | DRAFT, CANCELLED |
| New Customer | isActive = true | inactive |

---

## 12. Monetary Dictionary (unchanged authoritative formulas)

| Term | Definition |
| ---- | ---------- |
| Storage | `Decimal(12,2)` |
| Rounding | `roundMoney` |
| Invoice grandTotal | `subtotal - discount + tax` |
| Invoice balance | `grandTotal - paidAmount` |
| Order lineTotal | `quantity × dailyRate × numberOfDays` |
| Order grandTotal (current persistence) | Equals item subtotal; header discount/delivery/labour often 0 |

Reuse domain/reporting rules — do not invent parallel money math.

---

## 13. Period Semantics

| Helper | Behavior |
| ------ | -------- |
| `inDateRange` | Inclusive both ends |
| Month helpers | UTC calendar month |
| Upcoming horizon | 14 UTC days from startOfToday (BD-3) |
| Overdue “today” | UTC startOfToday (BD-4) |

**CURRENT PRODUCTION BEHAVIOR:** Dashboard `getDashboard` ignores query `dateFrom`/`dateTo` and forces calendar MTD — leave unchanged unless a separate task migrates it.

---

## 14. Edge Case Rules (frozen)

| Case | Rule |
| ---- | ---- |
| Zero records | Counts/sums 0; utilization 0; averages 0 |
| Null dueDate | Aging uses invoiceDate |
| VOID/DRAFT invoice | Excluded from billed & AR |
| Partial payment | PARTIALLY_PAID; balance > 0 in AR |
| Overdue rental + RESERVED | Included under BD-4 (not physical claim) |
| `maximumStock` null | Not overstock |
| Cancelled PO | Excluded from Ordered Procurement Value; may remain in legacy report |

---

## 15. Complete Analytics Metric Contract Matrix (frozen)

| ID | Metric | Formula / Rule | Date | Statuses | Decision |
| -- | ------ | -------------- | ---- | -------- | -------- |
| REV-BOOK | Booked Rental Value | sum(`grandTotal`) | bookingDate | excl. DRAFT, CANCELLED | **APPROVED / FROZEN** |
| REV-BOOK-LINE | Booked Line Value | sum(`lineTotal`) | order.bookingDate | same order filter | **APPROVED / FROZEN** |
| REV-BILL | Billed Revenue | sum(invoice `grandTotal`) | invoiceDate | ISSUED, PARTIALLY_PAID, PAID | **APPROVED / FROZEN** |
| REV-CASH | Collected Cash | sum(payment `amount`) | paymentDate | POSTED | **APPROVED / FROZEN** |
| REV-GL | Recognized Revenue | P&L INCOME | journalDate | Journal POSTED | **APPROVED / FROZEN** |
| FIN-AR | Outstanding AR | sum(`balance`) where > 0 | stock | ISSUED, PARTIALLY_PAID | **APPROVED / FROZEN** |
| FIN-AR-CNT | Outstanding Invoice Count | count | stock | ISSUED, PARTIALLY_PAID | **APPROVED / FROZEN** |
| FIN-PAID | Paid Invoice Amount | — | — | — | **NOT A KPI** (BD-5) |
| FIN-OD | Overdue Invoice Amount | AR aging non-current buckets | dueDate??invoiceDate | ISSUED, PARTIALLY_PAID | **APPROVED / FROZEN** |
| RNT-ACT | Active Rental | count | — | CONFIRMED, RESERVED | **APPROVED / FROZEN** |
| RNT-UP | Upcoming Rental | count | eventStartDate | CONFIRMED, RESERVED; 14d horizon | **APPROVED / FROZEN** |
| RNT-DONE | Completed Rental | count | — | COMPLETED | **APPROVED / FROZEN** |
| RNT-OD | Overdue Rental | count | expectedReturnDate | excl. COMPLETED, CANCELLED, DRAFT | **APPROVED / FROZEN** |
| RNT-UTIL | Utilization | reserved/onHand×100 | — | active inventory | **APPROVED / FROZEN** |
| INV-AVAIL / INV-RES | Available / Reserved | as §6 | — | isActive | **APPROVED / FROZEN** |
| INV-RENT | Physically rented qty | — | — | — | **CAPABILITY GAP** (BD-6) |
| INV-LOW / OVER | Low / Overstock | as §6 | — | isActive | **APPROVED / FROZEN** |
| CUS-NEW | New Customer | count | createdAt | isActive | **APPROVED / FROZEN** |
| SUP-ORD | Ordered Procurement Value | sum(qty×unitCost) | orderDate | excl. DRAFT, CANCELLED | **APPROVED / FROZEN** |
| OPS-AUM-ASSET | Asset Under Maintenance | count | — | UNDER_MAINTENANCE | **APPROVED / FROZEN** |
| OPS-AUM-JOBS | Rental Maint/Repair Jobs | open jobs | — | per job statuses | **APPROVED / FROZEN** |
| PHYS-ON-RENT | Physically On Rent | — | — | — | **FUTURE CAPABILITY GAP** |

---

## 16. Approved Decisions — BD-1 through BD-9 (Phase 24.1.1-C)

| Decision | Frozen rule | Status |
| -------- | ----------- | ------ |
| **BD-1** | Booked Rental Value = `grandTotal` excl. DRAFT+CANCELLED; date `bookingDate` (event-start envelope); new metric only | **APPROVED / FROZEN** |
| **BD-2** | Active Rental = CONFIRMED + RESERVED (not physical on-rent) | **APPROVED / FROZEN** |
| **BD-3** | Upcoming = eventStartDate in [today, today+14] UTC; CONFIRMED\|RESERVED; excl. DRAFT/CANCELLED/COMPLETED | **APPROVED / FROZEN** |
| **BD-4** | Overdue = expectedReturnDate < UTC startOfToday; excl. COMPLETED/CANCELLED/DRAFT | **APPROVED / FROZEN** |
| **BD-5** | No “Paid Invoice Amount” KPI; use Collected Cash + Outstanding AR | **APPROVED / FROZEN** |
| **BD-6** | No physically rented quantity KPI; CAPABILITY GAP; use Reserved/Available | **APPROVED / FROZEN** (deferred) |
| **BD-7** | Separate Asset Under Maintenance vs Rental Maint/Repair Jobs | **APPROVED / FROZEN** |
| **BD-8** | New Customer = createdAt in UTC period AND isActive | **APPROVED / FROZEN** |
| **BD-9** | Ordered Procurement Value = qty×unitCost by orderDate; excl. DRAFT+CANCELLED; new metric only | **APPROVED / FROZEN** |

---

## 17. Backward Compatibility Rules — FROZEN

```text
Existing behavior ≠ Automatically replaced by new analytics semantics
```

**Must not alter in Phase 24.1.x without a separate approved migration:**

- `/api/reports/*` response field meanings and default filters  
- Existing dashboard calculation formulas  
- Existing financial-report semantics  

**Must do:** Introduce **qualified new** analytics fields/metrics.  
**Must not do:** Silently redefine `totalRevenue`, pulse active counts, or procurement totals in place.

Any migration of existing dashboard labels/calculations = **separate approved task**.

---

## 18. Capability Gaps — FROZEN

1. **Physical On-Rent Tracking** — Reliable `DISPATCHED` / `ON_RENT` lifecycle recording on rental orders is not established.  
2. **Physical Rented Quantity** — No canonical physically-rented quantity KPI (BD-6).  
3. **Received Procurement Value** — Not introduced until receiving semantics are sufficiently authoritative.  
4. **bookingDate Semantics** — Represents event-start envelope, not order creation time.

These are **known limitations**, not bugs to fix in documentation phases.

---

## 19. Phase 24.1.2 Implementation Implications (guidance only)

When implementation is explicitly approved:

| Layer | Guidance |
| ----- | -------- |
| Architecture | Extend `reporting` (+ consume `financial-report`); no greenfield analytics domain |
| DTOs | Qualified names only (`bookedRentalValue`, `billedRevenue`, `collectedCash`, …) |
| APIs | New endpoints or additive fields; do not break existing report contracts |
| Permissions | Reuse `reports:read` / `financial-reports:read` |
| Tests | Assert frozen status/date inclusion tables |
| UI | Later; do not change production dashboard math without migration task |

**STOP:** Do not implement until Phase 24.1.2 is explicitly started.

---

## 20. Final Semantic Status

```text
Analytics Metric Contract Status:
SEMANTICS FROZEN — READY FOR IMPLEMENTATION
```

**Contract version:** v1.0  
**Application / package version:** unchanged by this document.

### Freeze checklist

- [x] BD-1 frozen  
- [x] BD-2 frozen  
- [x] BD-3 frozen  
- [x] BD-4 frozen  
- [x] BD-5 frozen  
- [x] BD-6 explicitly deferred / capability gap  
- [x] BD-7 frozen  
- [x] BD-8 frozen  
- [x] BD-9 frozen  
- [x] Revenue vocabulary frozen  
- [x] Date semantics frozen  
- [x] Status semantics frozen  
- [x] Backward compatibility documented  
- [x] Capability gaps documented  
- [x] No production behavior changed by this document  

### Validation (Phase 24.1.1-C)

```text
Production source code modified: NO
Frontend modified: NO
Backend modified: NO
API behavior changed: NO
Prisma schema modified: NO
Database modified: NO
Migrations created: NO
Tests modified: NO
Dependencies changed: NO
Existing business behavior changed: NO
Production deployment affected: NO
```

**Files modified:**

```text
ONLY:
docs/decisions/ANALYTICS_METRIC_CONTRACT_v1.0.md
```

---

## Appendix A — Historical: Phase 24.1.1-B decision sheet

The following was the pre-approval decision analysis (recommendations only). It is retained for audit trail. **Authoritative rules are §§3–18 above**, not the older “BUSINESS APPROVAL REQUIRED” recommendations.

Summary of what was recommended then and later approved in 24.1.1-C:

| BD | 24.1.1-B recommendation | 24.1.1-C outcome |
| -- | ----------------------- | ---------------- |
| BD-1 | Exclude DRAFT+CANCELLED for new field | **Approved** |
| BD-2 | Keep CONFIRMED+RESERVED; defer physical | **Approved** (Active = CONFIRMED+RESERVED) |
| BD-3 | eventStart + CONFIRMED\|RESERVED; N=14 | **Approved** |
| BD-4 | expectedReturn past; excl. COMPLETED/CANCELLED/DRAFT | **Approved** |
| BD-5 | No Paid Invoice Amount KPI | **Approved** |
| BD-6 | Defer physically rented qty | **Approved** (capability gap) |
| BD-7 | Separate asset vs rental jobs | **Approved** |
| BD-8 | createdAt + isActive | **Approved** |
| BD-9 | Ordered value excl. DRAFT+CANCELLED (new metric) | **Approved** |

Full option tables and consequence matrices from 24.1.1-B remain in git history prior to the 24.1.1-C rewrite of this file’s body; the frozen contract above is the source of truth for implementation.
