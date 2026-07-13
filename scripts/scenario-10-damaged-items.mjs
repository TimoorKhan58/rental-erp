/**
 * Scenario 10 – Damaged Items
 *
 * Returned 10 Chairs, 2 broken.
 * Check: damage entry, damage charges, inventory status.
 *
 * Usage: node --env-file=.env scripts/scenario-10-damaged-items.mjs
 */
import { config } from "dotenv";

config();

const BASE = process.env.FLOW_BASE_URL ?? "http://localhost:3000";
const CREDENTIALS = [
  {
    email: process.env.FLOW_EMAIL ?? "admin@local.dev",
    password: process.env.FLOW_PASSWORD ?? "LocalAdmin123!",
  },
  {
    email: process.env.BOOTSTRAP_EMAIL ?? "admin@localhost.local",
    password: process.env.BOOTSTRAP_PASSWORD ?? "Admin123!Local",
  },
];

const QTY = 10;
const QTY_GOOD = 8;
const QTY_DAMAGED = 2;
const DAILY_RATE = 50;
const DAMAGE_UNIT_CHARGE = 500; // repair/damage fee per broken chair
const START_DATE = "2026-08-07";
const END_DATE = "2026-08-08";
const RENTAL_DAYS = 1;
const RENTAL_TOTAL = QTY * DAILY_RATE * RENTAL_DAYS; // 500
const DAMAGE_TOTAL = QTY_DAMAGED * DAMAGE_UNIT_CHARGE; // 1,000

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 50,
};

const cookieJar = new Map();
const checks = [];

function storeCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(method, path, body) {
  const headers = {
    Accept: "application/json",
    Origin: BASE,
    Cookie: cookieHeader(),
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  storeCookies(response);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json };
}

async function apiOrThrow(method, path, body) {
  const result = await api(method, path, body);
  if (!result.ok) {
    const err = new Error(
      `${method} ${path} -> ${result.status}: ${JSON.stringify(result.json)}`,
    );
    err.status = result.status;
    err.body = result.json;
    throw err;
  }
  return result.json;
}

function stamp() {
  return new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
}

function log(step, detail) {
  console.log(`\n=== ${step} ===`);
  if (detail !== undefined) console.log(detail);
}

function listItems(res) {
  return res.data?.items ?? res.data ?? [];
}

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(ok ? `PASS: ${name}` : `FAIL: ${name}`, detail ?? "");
  if (!ok) throw new Error(`Check failed: ${name}`);
}

function observe(name, detail) {
  checks.push({ name, ok: true, detail, observe: true });
  console.log(`OBSERVE: ${name}`, detail ?? "");
}

async function signIn() {
  let lastError;
  for (const cred of CREDENTIALS) {
    cookieJar.clear();
    const response = await fetch(`${BASE}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: BASE,
      },
      body: JSON.stringify({ email: cred.email, password: cred.password }),
    });
    storeCookies(response);
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      console.log("Signed in as", body.user?.email ?? cred.email);
      return;
    }
    lastError = `Sign-in failed for ${cred.email}: ${response.status}`;
  }
  throw new Error(lastError ?? "Sign-in failed");
}

async function ensureCustomer() {
  const customers = listItems(await apiOrThrow("GET", "/api/customers?pageSize=50"));
  let customer = customers.find((c) => c.isActive !== false) ?? customers[0];
  if (!customer) {
    customer = (
      await apiOrThrow("POST", "/api/customers", {
        customerCode: `CUST-S10-${stamp()}`,
        name: "Scenario 10 Customer",
        phone: "+92 300 1010111",
        address: "Lahore, Pakistan",
        isActive: true,
      })
    ).data;
  }
  return customer;
}

async function ensureWarehouse() {
  const warehouses = listItems(await apiOrThrow("GET", "/api/warehouses?pageSize=50"));
  let warehouse = warehouses.find((w) => w.isActive !== false) ?? warehouses[0];
  if (!warehouse) {
    warehouse = (
      await apiOrThrow("POST", "/api/warehouses", {
        warehouseCode: `WH-S10-${stamp()}`,
        name: "Scenario 10 Warehouse",
        isActive: true,
      })
    ).data;
  }
  return warehouse;
}

async function ensureProduct() {
  const products = listItems(
    await apiOrThrow(
      "GET",
      `/api/products?pageSize=100&search=${encodeURIComponent(PRODUCT.productCode)}`,
    ),
  );
  let product =
    products.find((p) => p.productCode === PRODUCT.productCode) ??
    products.find((p) => p.name?.toLowerCase() === PRODUCT.name.toLowerCase());
  if (!product) {
    product = (
      await apiOrThrow("POST", "/api/products", {
        productCode: PRODUCT.productCode,
        name: PRODUCT.name,
        unit: PRODUCT.unit,
        rentalRate: PRODUCT.rentalRate,
        isActive: true,
      })
    ).data;
  }
  return product;
}

async function getInventory(productId, warehouseId) {
  const inventories = listItems(await apiOrThrow("GET", "/api/inventory?pageSize=100"));
  return (
    inventories.find(
      (i) => i.productId === productId && i.warehouseId === warehouseId,
    ) ?? null
  );
}

async function ensureStock(productId, warehouseId, minAvailable) {
  let row = await getInventory(productId, warehouseId);
  if (!row) {
    return (
      await apiOrThrow("POST", "/api/inventory", {
        productId,
        warehouseId,
        quantityOnHand: minAvailable,
        reservedQuantity: 0,
        minimumStock: 0,
        maximumStock: Math.max(minAvailable * 2, 200),
        isActive: true,
      })
    ).data;
  }
  const available =
    row.availableQuantity ??
    (row.quantityOnHand ?? 0) - (row.reservedQuantity ?? 0);
  if (available < minAvailable) {
    const neededOnHand = (row.reservedQuantity ?? 0) + minAvailable;
    row = (
      await apiOrThrow("PATCH", `/api/inventory/${row.id}`, {
        quantityOnHand: Math.max(neededOnHand, row.quantityOnHand ?? 0, minAvailable),
      })
    ).data;
  }
  return row;
}

async function listOrderInvoices(orderId, customerId) {
  try {
    return listItems(
      await apiOrThrow(
        "GET",
        `/api/rental-invoices?pageSize=100&rentalOrderId=${orderId}`,
      ),
    );
  } catch {
    const all = listItems(
      await apiOrThrow(
        "GET",
        `/api/rental-invoices?pageSize=100&customerId=${customerId}`,
      ),
    );
    return all.filter((inv) => inv.rentalOrderId === orderId);
  }
}

async function main() {
  const suffix = stamp();

  log("Scenario 10 – Damaged Items", {
    returned: QTY,
    damaged: QTY_DAMAGED,
    good: QTY_GOOD,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  const invBefore = await getInventory(product.id, warehouse.id);
  const onHandBefore = invBefore?.quantityOnHand ?? 0;
  const reservedBefore = invBefore?.reservedQuantity ?? 0;

  log("1. Deliver 10 chairs");
  const orderNumber = `RO-S10-${suffix}`;
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 10 – 2 damaged on return",
      items: [
        { productId: product.id, quantity: QTY, dailyRate: DAILY_RATE },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/rental-orders/${created.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${created.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const dispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S10-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S10-001",
      driverName: "Scenario 10 Driver",
      driverPhone: "+92 301 1010101",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 10 delivery",
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity: QTY,
        },
      ],
    })
  ).data;
  await apiOrThrow("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const dispatchDone = (
    await apiOrThrow("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  const dispatchItem = dispatchDone.items?.[0] ?? dispatch.items?.[0];

  const invAfterDispatch = await getInventory(product.id, warehouse.id);
  observe("Inventory after delivery (OUT 10)", {
    quantityOnHand: invAfterDispatch?.quantityOnHand,
    reservedQuantity: invAfterDispatch?.reservedQuantity,
    deltaOnHand: (invAfterDispatch?.quantityOnHand ?? 0) - onHandBefore,
  });

  log("2. Return 10: 8 good + 2 damaged");
  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S10-${suffix}`,
      rentalOrderId: created.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Scenario 10 return with 2 broken chairs",
      items: [
        {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchItem.id,
          quantity: QTY,
        },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/returns/${ret.id}/receive`);
  const inspected = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/inspect`, {
      items: [
        {
          rentalOrderItemId: orderItem.id,
          goodQuantity: QTY_GOOD,
          damagedQuantity: QTY_DAMAGED,
          lostQuantity: 0,
          notes: "2 chairs broken / damaged",
        },
      ],
    })
  ).data;

  const item = inspected.items?.[0];
  check("Damage entry recorded: damagedQuantity = 2", item?.damagedQuantity === QTY_DAMAGED, {
    goodQuantity: item?.goodQuantity,
    damagedQuantity: item?.damagedQuantity,
    lostQuantity: item?.lostQuantity,
  });
  check("Good entry recorded = 8", item?.goodQuantity === QTY_GOOD, {
    goodQuantity: item?.goodQuantity,
  });

  const returnDone = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/complete`)
  ).data;
  check("Return COMPLETED", returnDone.status === "COMPLETED", {
    status: returnDone.status,
  });

  const finalReturn = (await apiOrThrow("GET", `/api/returns/${ret.id}`)).data;
  check(
    "Damage entry persisted after complete",
    finalReturn.items?.[0]?.damagedQuantity === QTY_DAMAGED,
    {
      damagedQuantity: finalReturn.items?.[0]?.damagedQuantity,
      goodQuantity: finalReturn.items?.[0]?.goodQuantity,
      notes: finalReturn.items?.[0]?.notes,
    },
  );

  const orderAfter = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check("Order COMPLETED", orderAfter.status === "COMPLETED", {
    status: orderAfter.status,
  });

  log("3. Inventory status after damaged return");
  const invAfterReturn = await getInventory(product.id, warehouse.id);
  const expectedOnHandAfterReturn =
    (invAfterDispatch?.quantityOnHand ?? 0) + QTY_GOOD; // only good restocked

  check(
    "Only good qty (8) restocked — damaged (2) NOT returned to on-hand",
    (invAfterReturn?.quantityOnHand ?? 0) === expectedOnHandAfterReturn,
    {
      onHandAfterDispatch: invAfterDispatch?.quantityOnHand,
      onHandAfterReturn: invAfterReturn?.quantityOnHand,
      expected: expectedOnHandAfterReturn,
      restocked: QTY_GOOD,
      notRestockedDamaged: QTY_DAMAGED,
    },
  );

  observe("Inventory has no damaged/quarantine status fields", {
    inventoryKeys: invAfterReturn ? Object.keys(invAfterReturn) : [],
    hasDamagedField: Object.prototype.hasOwnProperty.call(
      invAfterReturn ?? {},
      "damagedQuantity",
    ),
    hasConditionField: Object.prototype.hasOwnProperty.call(
      invAfterReturn ?? {},
      "condition",
    ),
    note: "Damaged qty is only on the return inspection record; stock on-hand simply excludes it from IN movement",
  });

  log("4. Damage charges auto-generated?");
  const invoicesAuto = await listOrderInvoices(created.id, customer.id);
  const autoDamageLines = invoicesAuto.flatMap((inv) =>
    (inv.items ?? []).filter((i) => i.lineType === "DAMAGE_CHARGE"),
  );
  check(
    "Damage charge NOT auto-generated",
    invoicesAuto.length === 0 && autoDamageLines.length === 0,
    {
      invoiceCount: invoicesAuto.length,
      autoDamageLines: autoDamageLines.length,
    },
  );

  log("5. Manual DAMAGE_CHARGE on invoice");
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S10-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-08-15",
      notes: "Scenario 10 – rental + damage charges",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Chair rental × ${QTY}`,
          quantity: QTY,
          unitPrice: DAILY_RATE * RENTAL_DAYS,
          sortOrder: 0,
        },
        {
          lineType: "DAMAGE_CHARGE",
          description: `Broken chairs × ${QTY_DAMAGED} @ ${DAMAGE_UNIT_CHARGE}`,
          quantity: QTY_DAMAGED,
          unitPrice: DAMAGE_UNIT_CHARGE,
          sortOrder: 1,
        },
      ],
    })
  ).data;

  const damageLine = (invoice.items ?? []).find(
    (i) => i.lineType === "DAMAGE_CHARGE",
  );
  check("Manual DAMAGE_CHARGE line accepted", damageLine != null, {
    line: damageLine,
  });
  check(
    "Damage charge = 2 × 500 = 1,000",
    damageLine != null && Number(damageLine.lineTotal) === DAMAGE_TOTAL,
    { lineTotal: damageLine?.lineTotal, expected: DAMAGE_TOTAL },
  );
  check(
    "Invoice total = rental 500 + damage 1,000 = 1,500",
    Number(invoice.grandTotal) === RENTAL_TOTAL + DAMAGE_TOTAL,
    {
      grandTotal: invoice.grandTotal,
      expected: RENTAL_TOTAL + DAMAGE_TOTAL,
    },
  );

  const issued = (
    await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`)
  ).data;

  const summary = {
    result: "PASS (behavior documented)",
    answers: {
      damageEntry: true,
      damageChargesAuto: false,
      damageChargesManual: true,
      inventoryStatus:
        "Only good (8) restocked to on-hand. Damaged (2) not restocked. No separate damaged inventory bucket/status.",
    },
    orderNumber,
    rentalOrderId: created.id,
    returnId: finalReturn.id,
    invoiceId: issued.id,
    inspection: {
      good: QTY_GOOD,
      damaged: QTY_DAMAGED,
      lost: 0,
    },
    inventory: {
      onHandBefore,
      reservedBefore,
      onHandAfterDispatch: invAfterDispatch?.quantityOnHand,
      onHandAfterReturn: invAfterReturn?.quantityOnHand,
      restockedGood: QTY_GOOD,
      excludedDamaged: QTY_DAMAGED,
    },
    charges: {
      autoGenerated: false,
      manualDamageCharge: DAMAGE_TOTAL,
      invoiceGrandTotal: issued.grandTotal,
    },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      return: `${BASE}/returns/${finalReturn.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
    },
  };

  console.log("\n========== SCENARIO 10 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 10 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
