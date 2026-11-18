# RentCore wording guide

Every screen should read like a person who runs a rental business talking,
not like the software describing itself. This guide is the reference for the
usability revamp (R1–R6) and for any new screen.

## Rules

1. **Say what it is for the user, not how it is built.** Never show
   "server", "API", "enforced", "domain", "record", "entity", "payload".
2. **Plain words over accounting or software jargon.** Keep the accounting
   terms only inside the Accounting pages, where accountants expect them.
3. **Counts read correctly:** use `countLabel(n, "item")` ("1 item",
   "3 items"), never "1 items" or "item(s)".
4. **Buttons say exactly what happens:** "Create order", "Send out",
   "Receive back", "Record payment". The result confirms it: "Order created".
5. **Every number names its unit or currency:** "PKR 6,999", "12 chairs",
   "3 days".
6. **Show names, not codes:** product names (codes may follow in grey),
   customer names, and the order number in every message about an order.
7. **Empty pages say what to do next:** "No customers yet. Add your first
   customer."
8. **Errors say what is wrong and how to fix it,** without apologising.

## Preferred terms

| Use | Instead of |
|---|---|
| Billed this month | Revenue MTD |
| Collected this month | Cash collected MTD |
| Still to collect | Accounts receivable, outstanding AR |
| Unpaid invoices by how late they are | Accounts receivable aging |
| Booked for upcoming orders | Qty committed, committed quantity |
| Free to rent | Available to rent, availability |
| With customers | On rent, in the field |
| Returns waiting to be checked | Pending returns, need inspection |
| Item in repair | Asset in repair / maintenance |
| Dispatch (goods leaving, delivered or collected) | Delivery (a pickup is not a delivery) |
| Rented days | Quantity-days |
| Share of stock rented out | Utilization |
| Invoice | Rental invoice (inside the rental flow) |

## Status words shown to users

Status words come from each module's status mapper
(`src/features/<module>/mappers/*-status.mapper.ts`) and must be plain,
capitalised normally ("Partly returned", not `PARTIALLY_RETURNED`).
