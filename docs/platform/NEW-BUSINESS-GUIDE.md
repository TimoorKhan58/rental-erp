# Setting up a new customer business

This is the platform owner's guide to adding a new tent or event rental
business to RentCore and getting it running. It takes about ten minutes
for you, plus the owner's own setup time.

Each business works in its own private space. It cannot see or change
any other business's customers, orders, stock, invoices or reports, and
MT Service's data stays private too.

---

## 1. One time only: your platform login

You manage businesses with a **platform login**. It is separate from your
MT Service login and cannot open any business's data.

Create it once, from the `rental-erp` folder. Use an email that is **not**
your MT Service login, and a strong password, ideally from a password
manager:

```bash
PLATFORM_OWNER_NAME="Your Name" PLATFORM_OWNER_EMAIL=you@example.com PLATFORM_OWNER_PASSWORD='your-strong-password' npm run platform:create-owner
```

Sign in at the normal login page with it. You land on **Manage
businesses** (`/platform`).

---

## 2. Before you create the business

Ask the new customer for:

| You need | Example |
|---|---|
| Business name | Khan Event Tents |
| Owner's full name | Imran Khan |
| Owner's email (it becomes their login; it must not already be used in RentCore) | imran@khantents.pk |
| Currency | PKR, symbol Rs |
| Time zone | Asia/Karachi |

---

## 3. Create the business

1. On **Manage businesses**, click **New business**.
2. Type the **business name**. The **short name** fills itself in
   (`khan-event-tents`). It identifies the business, uses lowercase letters,
   numbers and dashes, and must be unique.
3. Check the currency and time zone.
4. Enter the owner's name and email. A **temporary password** is already
   generated for you. Click **Generate another** if you want a different
   one.
5. Click **Create business**.

RentCore then sets everything up in one step:

- the business and its company profile;
- document numbering, so its first order is `RO-00001`;
- the standard chart of accounts (Cash, Accounts Receivable, Rental
  Revenue, General Expense), so invoices and payments reach its books;
- starter units of measure and expense categories;
- the owner's login.

If anything fails, nothing is created, and you can simply try again.

Next, RentCore shows the **sign-in address, email and temporary password**
once. Send them to the owner privately, for example by phone or a
messaging app, never in a public group.

---

## 4. The owner's first sign-in

The owner signs in with the temporary password and is taken straight to
**Choose a new password**. Nothing else opens until they have chosen their
own password, so nobody but them knows it from then on.

Then they set up their business, usually in this order:

1. **Settings → Company**: business name, address, phone, tax numbers
   (NTN/STRN) and logo. These appear on their invoices.
2. **Warehouses**: where their stock is kept.
3. **Products**: their tents, chairs and other items, with rental rates.
4. **Inventory**: how many of each product are in each warehouse.
5. **Customers**.
6. **Users**: their staff, each with a role (manager, worker, accountant,
   viewer). The owner chooses each person's first password, and RentCore
   asks that person to choose their own at first sign-in.

After that they can take orders, reserve, dispatch, receive returns,
invoice and record payments.

---

## 5. Everyday platform tasks

All of these are on **Manage businesses** and are recorded in the platform
audit log, which never stores passwords.

| Situation | What to do |
|---|---|
| The owner forgot their password | **Reset owner password**. Send the new temporary password privately. They are signed out everywhere and choose a new password at next sign-in. |
| A staff member forgot their password | The business owner resets it under **Users**. |
| A customer stops paying or leaves | **Deactivate**. Their users are signed out and cannot sign in. **No data is deleted.** |
| They come back | **Reactivate**. |
| You want to see activity | The table shows users, orders and the last order date for every business. |

---

## 6. Checks (for whoever looks after the server)

- **Is every business fully set up?** Report only, changes nothing:

  ```bash
  CHECK_ONLY=1 BUSINESS=all npm run business:provision
  ```

  Each business should say `ready: yes`. If one does not, run it without
  `CHECK_ONLY=1` to fill in what is missing (it never changes existing
  data).
- **Backups:** take one before every update (`npm run db:backup`, see
  `docs/production/DATABASE_OPERATIONS.md`).
- **Full onboarding rehearsal** on a copy of the database, never on live:
  `scripts/platform/rehearsal-onboarding-check.sh` (instructions at the
  top of the file).

---

## 7. Common questions

**The owner says "This email already has a login".** Each email can only
belong to one login in RentCore. Use a different email for them.

**Can one person work for two businesses?** Not with one login. They need
a separate email (and login) for each business.

**Can a business see another business's data, even by mistake?** No.
Every request is limited to the signed-in user's business by the
application, and again by the database itself. Automated tests check this
on every change.

**Can I, as platform owner, open a business's data?** No. Your platform
login only manages businesses. If you need to see inside a business (for
example to help with support), the owner can create a user for you there.
