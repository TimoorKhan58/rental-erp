/**
 * Manyar Tent — complete wedding rental demo scenario.
 *
 * Seeds 9 products, one customer event, dispatch, mixed return
 * (good / damaged / lost / 2-day late), and an issued invoice with
 * rental + damage + lost + late + delivery/pickup lines.
 *
 * Usage (from rental-erp/):
 *   node ./scripts/seed-wedding-scenario.mjs
 *
 * Re-run safely: removes prior DEMO-WED-* records first.
 */
import "dotenv/config";
import pg from "pg";
import { randomUUID } from "node:crypto";

const { Client } = pg;

const PREFIX = "DEMO-WED";

/** Event window: 2 rental days. Expected return Jul 20; actual Jul 22 (2 days late). */
const EVENT = {
  booking: "2026-07-15",
  start: "2026-07-18",
  end: "2026-07-19",
  expectedReturn: "2026-07-20",
  dispatch: "2026-07-18",
  actualReturn: "2026-07-22",
  lateDays: 2,
  rentalDays: 2,
};

const PRODUCTS = [
  {
    code: `${PREFIX}-TENT-20X40`,
    name: "Wedding Marquee 20×40",
    description: "Main reception marquee with sidewalls",
    unit: "PCS",
    rate: 25000,
    cost: 450000,
    stock: 5,
    qty: 1,
    return: { good: 1, damaged: 0, lost: 0, note: "Returned clean — customer happy with look" },
  },
  {
    code: `${PREFIX}-TENT-15X30`,
    name: "Garden Canopy 15×30",
    description: "Secondary canopy for mehndi / outdoor seating",
    unit: "PCS",
    rate: 12000,
    cost: 180000,
    stock: 4,
    qty: 1,
    return: { good: 1, damaged: 0, lost: 0, note: "OK" },
  },
  {
    code: `${PREFIX}-CHAIR-BANQUET`,
    name: "Banquet Chair (Gold)",
    description: "Padded banquet chair with gold frame",
    unit: "PCS",
    rate: 45,
    cost: 4500,
    stock: 400,
    qty: 200,
    return: {
      good: 190,
      damaged: 8,
      lost: 2,
      note: "8 frames bent after guest overload; 2 chairs missing from guest tables",
    },
  },
  {
    code: `${PREFIX}-TABLE-RND-8`,
    name: "Round Table 8-seat",
    description: "Banquet round table",
    unit: "PCS",
    rate: 350,
    cost: 18000,
    stock: 60,
    qty: 25,
    return: {
      good: 24,
      damaged: 1,
      lost: 0,
      note: "One tabletop scratched during teardown",
    },
  },
  {
    code: `${PREFIX}-CARPET-RED`,
    name: "Red Carpet Runner 12×15",
    description: "Ceremonial aisle carpet",
    unit: "PCS",
    rate: 2500,
    cost: 35000,
    stock: 20,
    qty: 4,
    return: { good: 4, damaged: 0, lost: 0, note: "Vacuumed and folded" },
  },
  {
    code: `${PREFIX}-LIGHT-LED`,
    name: "LED String Light Set",
    description: "Warm-white decorative string lights",
    unit: "SET",
    rate: 800,
    cost: 12000,
    stock: 30,
    qty: 10,
    return: {
      good: 9,
      damaged: 0,
      lost: 1,
      note: "One full set not recovered from stage backdrop",
    },
  },
  {
    code: `${PREFIX}-STAGE-4X8`,
    name: "Stage Platform 4×8",
    description: "Modular stage deck",
    unit: "PCS",
    rate: 4500,
    cost: 55000,
    stock: 20,
    qty: 6,
    return: { good: 6, damaged: 0, lost: 0, note: "OK" },
  },
  {
    code: `${PREFIX}-GEN-5KVA`,
    name: "Generator 5KVA",
    description: "Backup power for lighting & sound",
    unit: "PCS",
    rate: 6000,
    cost: 220000,
    stock: 3,
    qty: 1,
    return: {
      good: 1,
      damaged: 0,
      lost: 0,
      note: "Returned late with rest of load — fuel topped up by customer",
    },
  },
  {
    code: `${PREFIX}-FAN-STAND`,
    name: "Industrial Pedestal Fan",
    description: "Standing fan for guest comfort",
    unit: "PCS",
    rate: 400,
    cost: 15000,
    stock: 25,
    qty: 8,
    return: {
      good: 7,
      damaged: 1,
      lost: 0,
      note: "One grill cracked in transit on return truck",
    },
  },
];

const FEES = {
  delivery: 8000,
  pickup: 5000,
  latePerDay: 7500, // business policy: late gear blocks next bookings
  damageMultiplier: 2,
  lostMultiplier: 5,
};

function money(n) {
  return Number(n.toFixed(2));
}

function formatPkr(n) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

function buildInvoiceLines(products) {
  const lines = [];
  let sort = 0;

  for (const p of products) {
    const unit = p.rate * EVENT.rentalDays;
    lines.push({
      lineType: "RENTAL_CHARGE",
      description: `${p.name} — ${EVENT.rentalDays} days @ ${formatPkr(p.rate)}/day`,
      quantity: p.qty,
      unitPrice: unit,
      lineTotal: money(p.qty * unit),
      sortOrder: sort++,
    });
  }

  for (const p of products) {
    if (p.return.damaged > 0) {
      const unit = p.rate * FEES.damageMultiplier;
      lines.push({
        lineType: "DAMAGE_CHARGE",
        description: `Damage — ${p.name} (${p.return.note})`,
        quantity: p.return.damaged,
        unitPrice: unit,
        lineTotal: money(p.return.damaged * unit),
        sortOrder: sort++,
      });
    }
    if (p.return.lost > 0) {
      const unit = p.rate * FEES.lostMultiplier;
      lines.push({
        lineType: "LOST_ITEM_CHARGE",
        description: `Lost — ${p.name} (${p.return.note})`,
        quantity: p.return.lost,
        unitPrice: unit,
        lineTotal: money(p.return.lost * unit),
        sortOrder: sort++,
      });
    }
  }

  lines.push({
    lineType: "DELIVERY_CHARGE",
    description: "Delivery & setup — DHA Phase 5 (crew + truck)",
    quantity: 1,
    unitPrice: FEES.delivery,
    lineTotal: FEES.delivery,
    sortOrder: sort++,
  });

  lines.push({
    lineType: "PICKUP_CHARGE",
    description: "Pickup after event",
    quantity: 1,
    unitPrice: FEES.pickup,
    lineTotal: FEES.pickup,
    sortOrder: sort++,
  });

  const lateTotal = FEES.latePerDay * EVENT.lateDays;
  lines.push({
    lineType: "MANUAL_CHARGE",
    description: `Late return fee — ${EVENT.lateDays} days past expected return (gear blocked next booking)`,
    quantity: EVENT.lateDays,
    unitPrice: FEES.latePerDay,
    lineTotal: lateTotal,
    sortOrder: sort++,
  });

  return lines;
}

async function cleanup(client) {
  // Delete in FK-safe order by demo codes
  await client.query(`
    DELETE FROM rental_invoice_items
    WHERE "rentalInvoiceId" IN (
      SELECT id FROM rental_invoices WHERE "invoiceNumber" LIKE $1
    )
  `, [`${PREFIX}-%`]);

  await client.query(`DELETE FROM payments WHERE "paymentNumber" LIKE $1`, [`${PREFIX}-%`]);
  await client.query(`DELETE FROM rental_invoices WHERE "invoiceNumber" LIKE $1`, [`${PREFIX}-%`]);

  await client.query(`
    DELETE FROM return_inspection_items
    WHERE "returnInspectionId" IN (
      SELECT id FROM return_inspections WHERE "returnNumber" LIKE $1
    )
  `, [`${PREFIX}-%`]);
  await client.query(`DELETE FROM return_inspections WHERE "returnNumber" LIKE $1`, [`${PREFIX}-%`]);

  await client.query(`
    DELETE FROM dispatch_items
    WHERE "dispatchId" IN (
      SELECT id FROM dispatches WHERE "dispatchNumber" LIKE $1
    )
  `, [`${PREFIX}-%`]);
  await client.query(`DELETE FROM dispatches WHERE "dispatchNumber" LIKE $1`, [`${PREFIX}-%`]);

  await client.query(`
    DELETE FROM rental_order_items
    WHERE "rentalOrderId" IN (
      SELECT id FROM rental_orders WHERE "orderNumber" LIKE $1
    )
  `, [`${PREFIX}-%`]);
  await client.query(`DELETE FROM rental_orders WHERE "orderNumber" LIKE $1`, [`${PREFIX}-%`]);

  await client.query(`
    DELETE FROM inventory_transactions
    WHERE "inventoryId" IN (
      SELECT i.id FROM inventory i
      JOIN products p ON p.id = i."productId"
      WHERE p."productCode" LIKE $1
    )
  `, [`${PREFIX}-%`]);

  await client.query(`
    DELETE FROM inventory
    WHERE "productId" IN (SELECT id FROM products WHERE "productCode" LIKE $1)
  `, [`${PREFIX}-%`]);

  await client.query(`DELETE FROM products WHERE "productCode" LIKE $1`, [`${PREFIX}-%`]);
  await client.query(`DELETE FROM customers WHERE "customerCode" LIKE $1`, [`${PREFIX}-%`]);
  await client.query(`DELETE FROM warehouses WHERE "warehouseCode" LIKE $1`, [`${PREFIX}-%`]);
  await client.query(`DELETE FROM categories WHERE name = $1`, [`${PREFIX} Event Hire`]);
}

const DEFAULT_UNITS = [
  { code: "PCS", name: "Pieces", description: "Individual items" },
  { code: "SET", name: "Set", description: "Grouped item set" },
];

async function ensureUnitsOfMeasure(client) {
  for (const unit of DEFAULT_UNITS) {
    await client.query(
      `INSERT INTO units_of_measure (id, code, name, description, "isActive", "createdAt", "updatedAt")
       VALUES ($1::uuid, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [randomUUID(), unit.code, unit.name, unit.description],
    );
  }

  const unitRes = await client.query(
    `SELECT id, code FROM units_of_measure WHERE code IN ('PCS', 'SET') AND "isActive" = true`,
  );
  const unitByCode = Object.fromEntries(unitRes.rows.map((r) => [r.code, r.id]));

  if (!unitByCode.PCS) {
    throw new Error(
      "Could not resolve unit PCS. The units_of_measure table may be missing — run: npm run db:migrate:deploy",
    );
  }

  return unitByCode;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Load rental-erp/.env first.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT id FROM users WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1`,
    );
    if (userRes.rowCount === 0) {
      throw new Error("No active ERP user found. Sign up / create a user first, then re-run.");
    }
    const createdById = userRes.rows[0].id;

    const unitByCode = await ensureUnitsOfMeasure(client);

    console.log("Cleaning previous DEMO-WED data (if any)...");
    await cleanup(client);

    // Category
    const categoryId = randomUUID();
    await client.query(
      `INSERT INTO categories (id, name, description, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, NOW(), NOW())`,
      [categoryId, `${PREFIX} Event Hire`, "Demo catalog for wedding scenario"],
    );

    // Warehouse
    const warehouseId = randomUUID();
    await client.query(
      `INSERT INTO warehouses (
         id, "warehouseCode", name, description, address, "contactPerson", phone, "isActive", "createdAt", "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW())`,
      [
        warehouseId,
        `${PREFIX}-WH-MAIN`,
        "Manyar Main Yard (Demo)",
        "Primary staging yard for event loads",
        "Main Boulevard Warehouse, Lahore",
        "Yard Supervisor",
        "+92 300 1112233",
      ],
    );

    // Customer — thinking like the client: wants a flawless walima, worries about bill surprises
    const customerId = randomUUID();
    await client.query(
      `INSERT INTO customers (
         id, "customerCode", name, phone, cnic, address, notes, "isActive", "createdAt", "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW())`,
      [
        customerId,
        `${PREFIX}-CUS-HAMZA`,
        "Hamza Raza (Walima Host)",
        "+92 321 5550188",
        "35202-1234567-1",
        "House 12, Street 7, DHA Phase 5, Lahore",
        "Customer asked for transparent billing: rental + any damage/loss + late fees if delayed. Prefers WhatsApp updates.",
      ],
    );

    // Products + inventory (post-return stock already applied for realism)
    const productRows = [];
    for (const p of PRODUCTS) {
      const productId = randomUUID();
      const inventoryId = randomUUID();
      const finalOnHand = p.stock - p.return.damaged - p.return.lost;
      const unitId = p.unit === "SET" && unitByCode.SET ? unitByCode.SET : unitByCode.PCS;

      await client.query(
        `INSERT INTO products (
           id, "productCode", "categoryId", "unitId", name, description,
           "purchaseCost", "rentalPricePerDay", "totalQuantity", "minimumStock",
           unit, "isRentable", "isActive", "createdAt", "updatedAt"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,true,NOW(),NOW())`,
        [
          productId,
          p.code,
          categoryId,
          unitId,
          p.name,
          p.description,
          p.cost,
          p.rate,
          finalOnHand,
          Math.max(1, Math.floor(p.stock * 0.1)),
          p.unit,
        ],
      );

      await client.query(
        `INSERT INTO inventory (
           id, "productId", "warehouseId", "quantityOnHand", "reservedQuantity",
           "minimumStock", "maximumStock", "isActive", "createdAt", "updatedAt"
         ) VALUES ($1,$2,$3,$4,0,$5,$6,true,NOW(),NOW())`,
        [
          inventoryId,
          productId,
          warehouseId,
          finalOnHand,
          Math.max(1, Math.floor(p.stock * 0.1)),
          p.stock,
        ],
      );

      // Stock ledger: OUT on dispatch, IN good qty on return
      await client.query(
        `INSERT INTO inventory_transactions (
           id, "inventoryId", "productId", "warehouseId", "movementType", quantity,
           "previousQuantity", "newQuantity", "referenceType", "referenceId", remarks,
           "createdAt", "createdById"
         ) VALUES
           ($1,$2,$3,$4,'OUT',$5,$6,$7,'DISPATCH',$8,$9, $10::timestamptz, $11),
           ($12,$2,$3,$4,'IN',$13,$7,$14,'RETURN',$15,$16, $17::timestamptz, $11)`,
        [
          randomUUID(),
          inventoryId,
          productId,
          warehouseId,
          p.qty,
          p.stock,
          p.stock - p.qty,
          `${PREFIX}-DSP-001`,
          `Demo dispatch OUT — ${p.name}`,
          `${EVENT.dispatch}T09:00:00+05:00`,
          createdById,
          randomUUID(),
          p.return.good,
          p.stock - p.qty + p.return.good,
          `${PREFIX}-RTN-001`,
          `Demo return IN (good only) — ${p.return.note}`,
          `${EVENT.actualReturn}T16:30:00+05:00`,
        ],
      );

      productRows.push({ ...p, productId });
    }

    // Rental order
    const orderId = randomUUID();
    const orderNumber = `${PREFIX}-RO-001`;
    let subtotal = 0;
    const orderItemIds = {};

    for (const p of productRows) {
      subtotal += p.qty * p.rate * EVENT.rentalDays;
    }
    const deliveryCharges = FEES.delivery;
    const labourCharges = 0;
    const discount = 0;
    const grandTotalOrder = money(subtotal + deliveryCharges + labourCharges - discount);

    await client.query(
      `INSERT INTO rental_orders (
         id, "orderNumber", "customerId", "warehouseId", status,
         "bookingDate", "eventStartDate", "eventEndDate", "expectedReturnDate", "actualReturnDate",
         "deliveryRequired", "deliveryAddress", "deliveryCharges", "labourCharges", discount,
         notes, subtotal, "grandTotal", "createdById", "createdAt", "updatedAt"
       ) VALUES (
         $1,$2,$3,$4,'COMPLETED',
         $5::date,$6::date,$7::date,$8::date,$9::date,
         true,$10,$11,$12,$13,
         $14,$15,$16,$17,NOW(),NOW()
       )`,
      [
        orderId,
        orderNumber,
        customerId,
        warehouseId,
        EVENT.booking,
        EVENT.start,
        EVENT.end,
        EVENT.expectedReturn,
        EVENT.actualReturn,
        "House 12, Street 7, DHA Phase 5, Lahore — rear gate for truck",
        deliveryCharges,
        labourCharges,
        discount,
        [
          "Walima reception for ~200 guests.",
          "Customer angle: wants predictable bill, no surprise damage fees without photos.",
          "Business angle: protect asset recovery — late return blocked next Saturday booking.",
          `Expected return ${EVENT.expectedReturn}; actual ${EVENT.actualReturn} (${EVENT.lateDays} days late).`,
        ].join(" "),
        subtotal,
        grandTotalOrder,
        createdById,
      ],
    );

    for (const p of productRows) {
      const itemId = randomUUID();
      orderItemIds[p.code] = itemId;
      const lineTotal = money(p.qty * p.rate * EVENT.rentalDays);
      await client.query(
        `INSERT INTO rental_order_items (
           id, "rentalOrderId", "productId", quantity, "rentalPricePerDay",
           "reservedQuantity", "numberOfDays", "lineTotal", notes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          itemId,
          orderId,
          p.productId,
          p.qty,
          p.rate,
          0,
          EVENT.rentalDays,
          lineTotal,
          p.return.note,
        ],
      );
    }

    // Dispatch
    const dispatchId = randomUUID();
    const dispatchNumber = `${PREFIX}-DSP-001`;
    await client.query(
      `INSERT INTO dispatches (
         id, "dispatchNumber", "rentalOrderId", "dispatchDate", "deliveryMethod",
         "vehicleNumber", "driverName", "driverPhone", "deliveryAddress", remarks,
         status, "loadedAt", "departedAt", "deliveredAt", "createdById", "createdAt", "updatedAt"
       ) VALUES (
         $1,$2,$3,$4::timestamptz,'DELIVERY',
         $5,$6,$7,$8,$9,
         'COMPLETED',$10::timestamptz,$11::timestamptz,$12::timestamptz,$13,NOW(),NOW()
       )`,
      [
        dispatchId,
        dispatchNumber,
        orderId,
        `${EVENT.dispatch}T08:00:00+05:00`,
        "LES-4821",
        "Imran Ali",
        "+92 300 4447788",
        "House 12, Street 7, DHA Phase 5, Lahore",
        "Morning setup — customer requested chairs before 11am",
        `${EVENT.dispatch}T07:30:00+05:00`,
        `${EVENT.dispatch}T08:15:00+05:00`,
        `${EVENT.dispatch}T10:45:00+05:00`,
        createdById,
      ],
    );

    for (const p of productRows) {
      await client.query(
        `INSERT INTO dispatch_items (
           id, "dispatchId", "productId", "rentalOrderItemId", quantity, notes
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          randomUUID(),
          dispatchId,
          p.productId,
          orderItemIds[p.code],
          p.qty,
          null,
        ],
      );
    }

    // Return with inspection split
    const returnId = randomUUID();
    const returnNumber = `${PREFIX}-RTN-001`;
    await client.query(
      `INSERT INTO return_inspections (
         id, "returnNumber", "rentalOrderId", "dispatchId", "inspectionDate",
         "inspectedById", remarks, status, "receivedAt", "inspectedAt", "completedAt",
         "createdAt", "updatedAt"
       ) VALUES (
         $1,$2,$3,$4,$5::timestamptz,
         $6,$7,'COMPLETED',$8::timestamptz,$9::timestamptz,$10::timestamptz,
         NOW(),NOW()
       )`,
      [
        returnId,
        returnNumber,
        orderId,
        dispatchId,
        `${EVENT.actualReturn}T15:00:00+05:00`,
        createdById,
        [
          "Pickup delayed 2 days — customer venue held décor overnight.",
          "Inspection: chairs damaged/lost, 1 table scratched, 1 LED set missing, 1 fan grill cracked.",
          "Photos attached in notes for customer dispute protection.",
        ].join(" "),
        `${EVENT.actualReturn}T14:20:00+05:00`,
        `${EVENT.actualReturn}T15:40:00+05:00`,
        `${EVENT.actualReturn}T16:10:00+05:00`,
      ],
    );

    for (const p of productRows) {
      const { good, damaged, lost } = p.return;
      await client.query(
        `INSERT INTO return_inspection_items (
           id, "returnInspectionId", "rentalOrderItemId", "returnedQuantity",
           "goodQuantity", "brokenQuantity", "repairQuantity", "lostQuantity",
           "missingQuantity", "damageCharge", notes
         ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,0,$8,$9)`,
        [
          randomUUID(),
          returnId,
          orderItemIds[p.code],
          p.qty,
          good,
          damaged,
          lost,
          money(damaged * p.rate * FEES.damageMultiplier),
          p.return.note,
        ],
      );
    }

    // Invoice — what the bill looks like from both angles
    const invoiceLines = buildInvoiceLines(productRows);
    const invoiceSubtotal = money(invoiceLines.reduce((s, l) => s + l.lineTotal, 0));
    const invoiceDiscount = 0;
    const invoiceTax = 0;
    const invoiceGrand = money(invoiceSubtotal - invoiceDiscount + invoiceTax);
    const paidAmount = money(Math.round(invoiceGrand * 0.4)); // 40% advance — customer cash flow
    const balance = money(invoiceGrand - paidAmount);

    const invoiceId = randomUUID();
    const invoiceNumber = `${PREFIX}-INV-001`;
    await client.query(
      `INSERT INTO rental_invoices (
         id, "invoiceNumber", "rentalOrderId", "customerId", "invoiceDate", "dueDate",
         subtotal, discount, tax, "grandTotal", "paidAmount", balance, status, notes,
         "issuedAt", "createdById", "createdAt", "updatedAt"
       ) VALUES (
         $1,$2,$3,$4,$5::date,$6::date,
         $7,$8,$9,$10,$11,$12,'PARTIALLY_PAID',$13,
         $14::timestamptz,$15,NOW(),NOW()
       )`,
      [
        invoiceId,
        invoiceNumber,
        orderId,
        customerId,
        EVENT.actualReturn,
        "2026-07-29",
        invoiceSubtotal,
        invoiceDiscount,
        invoiceTax,
        invoiceGrand,
        paidAmount,
        balance,
        [
          "Bill breakdown for transparency:",
          "1) Agreed rental for 2 event days.",
          "2) Damage @ 2× daily rate per damaged unit.",
          "3) Loss @ 5× daily rate per lost unit.",
          "4) Late return fee — asset blocked next booking.",
          "5) Delivery + pickup.",
          `Advance received ${formatPkr(paidAmount)}; balance due ${formatPkr(balance)}.`,
        ].join(" "),
        `${EVENT.actualReturn}T17:00:00+05:00`,
        createdById,
      ],
    );

    for (const line of invoiceLines) {
      await client.query(
        `INSERT INTO rental_invoice_items (
           id, "rentalInvoiceId", "lineType", description, quantity, "unitPrice", "lineTotal", "sortOrder"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          randomUUID(),
          invoiceId,
          line.lineType,
          line.description,
          line.quantity,
          line.unitPrice,
          line.lineTotal,
          line.sortOrder,
        ],
      );
    }

    // Partial payment posted
    const paymentId = randomUUID();
    await client.query(
      `INSERT INTO payments (
         id, "paymentNumber", "rentalInvoiceId", "customerId", "paymentDate",
         amount, "paymentMethod", "referenceNumber", notes, status,
         "postedAt", "createdById", "createdAt", "updatedAt"
       ) VALUES (
         $1,$2,$3,$4,$5::date,
         $6,'BANK_TRANSFER',$7,$8,'POSTED',
         $9::timestamptz,$10,NOW(),NOW()
       )`,
      [
        paymentId,
        `${PREFIX}-PAY-001`,
        invoiceId,
        customerId,
        EVENT.booking,
        paidAmount,
        "TRX-HBL-778221",
        "40% advance on booking confirmation — customer requested receipt on WhatsApp",
        `${EVENT.booking}T12:00:00+05:00`,
        createdById,
      ],
    );

    await client.query("COMMIT");

    // Console story
    console.log("\n════════════════════════════════════════════════════════");
    console.log("  MANYAR TENT — Wedding demo scenario loaded");
    console.log("════════════════════════════════════════════════════════");
    console.log("\nStory (customer lens)");
    console.log("  Hamza Raza booked a walima for ~200 guests in DHA Phase 5.");
    console.log("  He wants a clear bill: rental first, then only proven damage/loss/late.");
    console.log("\nStory (business lens)");
    console.log("  Protect inventory recovery. Late gear blocked next Saturday job.");
    console.log("  Damage/loss multipliers fund repair & replacement without argument.");
    console.log("\nCatalog: 9 products seeded");
    for (const p of productRows) {
      console.log(
        `  • ${p.name} ×${p.qty}  → good ${p.return.good} / damaged ${p.return.damaged} / lost ${p.return.lost}`,
      );
    }
    console.log("\nTimeline");
    console.log(`  Event       ${EVENT.start} → ${EVENT.end} (${EVENT.rentalDays} days)`);
    console.log(`  Expected RT ${EVENT.expectedReturn}`);
    console.log(`  Actual RT   ${EVENT.actualReturn}  ← ${EVENT.lateDays} days late`);
    console.log("\nBill");
    for (const line of invoiceLines) {
      console.log(
        `  [${line.lineType}] ${line.description} → ${formatPkr(line.lineTotal)}`,
      );
    }
    console.log("  ─────────────────────────────────────");
    console.log(`  Grand total   ${formatPkr(invoiceGrand)}`);
    console.log(`  Paid advance  ${formatPkr(paidAmount)}`);
    console.log(`  Balance due   ${formatPkr(balance)}`);
    console.log("\nOpen in UI");
    console.log(`  Order     /rental-orders  →  ${orderNumber}`);
    console.log(`  Dispatch  /dispatches     →  ${dispatchNumber}`);
    console.log(`  Return    /returns        →  ${returnNumber}`);
    console.log(`  Invoice   /rental-invoices → ${invoiceNumber}`);
    console.log(`  Customer  /customers      →  ${PREFIX}-CUS-HAMZA`);
    console.log(`  Products  /products       →  filter ${PREFIX}-`);
    console.log("════════════════════════════════════════════════════════\n");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("\nDemo seed failed:", error.message);
  process.exit(1);
});
