#!/usr/bin/env node
/**
 * One-off data correction for QA-012 (reservation drift), 2026-11-11.
 *
 * Before the QA-012 fix, completing a return released reservation a second
 * time and could consume other orders' holds. This left three inventory rows
 * with a reservedQuantity that no longer matched what orders actually hold:
 *
 *   Plastic Water Cooler  RO-001            hold eaten by RET-00003  -> RESERVE 10
 *   Nail / Stake          RO-00020          hold eaten by RET-00012  -> RESERVE 1
 *   Nail / Stake          RO-00026          hold eaten by RET-00014  -> RESERVE 1
 *   Table 2.5x4           RO-01 (COMPLETED) leftover hold            -> RELEASE 9
 *
 * Each correction is written as a normal RESERVE/RELEASE ledger entry with an
 * audit log row, inside one transaction. Every row's starting reservedQuantity
 * is checked first; if anything differs from what was measured, nothing is
 * written.
 *
 * Usage (from the project root):
 *   node scripts/db/corrections/2026-11-11-qa012-reservation-repair.mjs           # preview only
 *   node scripts/db/corrections/2026-11-11-qa012-reservation-repair.mjs --apply   # write changes
 *
 * Requires DATABASE_URL (read from .env). Take a backup first.
 */
import { randomUUID } from "node:crypto";
import process from "node:process";

import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ quiet: true });

const APPLY = process.argv.includes("--apply");
const ACTOR_USER_ID = "5dd1e56b-ff40-4ff7-a33c-ba94941b16f2"; // owner account that ran the UAT
const WAREHOUSE_CODE = "MTC-WH-MAIN";
const NOTE = "Data correction QA-012 (2026-11-11)";

const CORRECTIONS = [
  {
    product: "Plastic Water Cooler / پلاسٹک کولر",
    order: "RO-001",
    type: "RESERVE",
    quantity: 10,
    expectedReservedBefore: 0,
    reason: "restore hold consumed by RET-00003 double release",
  },
  {
    product: "Nail / Stake / کیل",
    order: "RO-00020",
    type: "RESERVE",
    quantity: 1,
    expectedReservedBefore: 0,
    reason: "restore hold consumed by RET-00012 double release",
  },
  {
    product: "Nail / Stake / کیل",
    order: "RO-00026",
    type: "RESERVE",
    quantity: 1,
    expectedReservedBefore: 1,
    reason: "restore hold consumed by RET-00014 double release",
  },
  {
    product: "Table 2.5×4 / میز ڈھائی چار",
    order: "RO-01",
    type: "RELEASE",
    quantity: 9,
    expectedReservedBefore: 38,
    reason: "release leftover hold of completed order",
  },
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const results = [];

try {
  await client.query("BEGIN");

  for (const fix of CORRECTIONS) {
    const { rows } = await client.query(
      `select i.id, i."productId", i."warehouseId", i."quantityOnHand", i."reservedQuantity", ro.id as order_id
         from inventory i
         join products p on p.id = i."productId"
         join warehouses w on w.id = i."warehouseId"
         join rental_orders ro on ro."orderNumber" = $3
        where p.name = $1 and w."warehouseCode" = $2
        for update of i`,
      [fix.product, WAREHOUSE_CODE, fix.order],
    );

    if (rows.length !== 1) {
      throw new Error(`Expected one inventory row for ${fix.product} / ${fix.order}, found ${rows.length}`);
    }

    const row = rows[0];
    const before = row.reservedQuantity;

    if (before !== fix.expectedReservedBefore) {
      throw new Error(
        `${fix.product}: reservedQuantity is ${before}, expected ${fix.expectedReservedBefore}. Data changed since the plan was made; nothing written.`,
      );
    }

    const after = fix.type === "RESERVE" ? before + fix.quantity : before - fix.quantity;

    if (after < 0 || after > row.quantityOnHand) {
      throw new Error(`${fix.product}: result ${after} is outside 0..${row.quantityOnHand}`);
    }

    const movementId = randomUUID();
    const remarks = `${NOTE}: ${fix.reason} (rental order ${fix.order})`;

    await client.query(
      `insert into inventory_transactions
         (id, "inventoryId", "productId", "warehouseId", "movementType", quantity,
          "previousQuantity", "newQuantity", "referenceType", "referenceId", remarks, "createdById")
       values ($1,$2,$3,$4,$5,$6,$7,$8,'RENTAL_ORDER',$9,$10,$11)`,
      [movementId, row.id, row.productId, row.warehouseId, fix.type, fix.quantity, before, after, row.order_id, remarks, ACTOR_USER_ID],
    );

    await client.query(
      `update inventory set "reservedQuantity" = $2, "updatedAt" = now() where id = $1`,
      [row.id, after],
    );

    await client.query(
      `insert into audit_logs (id, "userId", module, "entityName", "recordId", action, status, "newValues")
       values ($1,$2,'stock-movements','StockMovement',$3,'CREATE','SUCCESS',$4)`,
      [
        randomUUID(),
        ACTOR_USER_ID,
        movementId,
        JSON.stringify({
          id: movementId,
          inventoryId: row.id,
          productId: row.productId,
          warehouseId: row.warehouseId,
          movementType: fix.type,
          quantity: fix.quantity,
          previousQuantity: before,
          newQuantity: after,
          referenceType: "RENTAL_ORDER",
          referenceId: row.order_id,
          remarks,
          createdById: ACTOR_USER_ID,
        }),
      ],
    );

    results.push({ product: fix.product, order: fix.order, movement: `${fix.type} ${fix.quantity}`, reservedBefore: before, reservedAfter: after });
  }

  console.table(results);

  if (APPLY) {
    await client.query("COMMIT");
    console.log("APPLIED: corrections committed.");
  } else {
    await client.query("ROLLBACK");
    console.log("PREVIEW ONLY: nothing was written. Re-run with --apply to commit.");
  }
} catch (error) {
  await client.query("ROLLBACK");
  console.error(`FAILED, rolled back: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
