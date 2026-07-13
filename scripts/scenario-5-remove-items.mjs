/**
 * Scenario 5 – Remove Items Before Delivery
 *
 * Customer orders 10 Tables, later removes 3 Tables (qty → 7).
 * Check: totals and inventory updated correctly.
 *
 * Usage: node --env-file=.env scripts/scenario-5-remove-items.mjs
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

const QTY_INITIAL = 10;
const QTY_REMOVED = 3;
const QTY_FINAL = QTY_INITIAL - QTY_REMOVED; // 7
const DAILY_RATE = 200;
const RENTAL_DAYS = 1;
const START_DATE = "2026-07-28";
const END_DATE = "2026-07-29";
const EXPECTED_TOTAL_INITIAL = QTY_INITIAL * DAILY_RATE * RENTAL_DAYS; // 2,000
const EXPECTED_TOTAL_FINAL = QTY_FINAL * DAILY_RATE * RENTAL_DAYS; // 1,400

const PRODUCT = {
  productCode: "TABLE-S1",
  name: "Table",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 30,
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

function orderLineTotal(order) {
  const item = order.items?.[0];
  if (!item) return 0;
  return Number(item.quantity) * Number(item.dailyRate) * RENTAL_DAYS;
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
        customerCode: `CUST-S5-${stamp()}`,
        name: "Scenario 5 Customer",
        phone: "+92 300 5556677",
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
        warehouseCode: `WH-S5-${stamp()}`,
        name: "Scenario 5 Warehouse",
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
        maximumStock: Math.max(minAvailable * 2, 100),
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

async function main() {
  const suffix = stamp();

  log("Scenario 5 – Remove Items Before Delivery", {
    ordered: QTY_INITIAL,
    removed: QTY_REMOVED,
    remaining: QTY_FINAL,
    expectedTotals: {
      initial: EXPECTED_TOTAL_INITIAL,
      afterRemove: EXPECTED_TOTAL_FINAL,
    },
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  const invBaseline = await getInventory(product.id, warehouse.id);
  const reservedBaseline = invBaseline?.reservedQuantity ?? 0;

  log("1. Create order for 10 Tables (DRAFT)");
  const orderNumber = `RO-S5-${suffix}`;
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 5 – initial 10 tables",
      items: [
        {
          productId: product.id,
          quantity: QTY_INITIAL,
          dailyRate: DAILY_RATE,
        },
      ],
    })
  ).data;

  check("Ordered qty = 10", created.items?.[0]?.quantity === QTY_INITIAL, {
    quantity: created.items?.[0]?.quantity,
  });
  check("Initial total = 2,000", orderLineTotal(created) === EXPECTED_TOTAL_INITIAL, {
    total: orderLineTotal(created),
  });

  log("2. Remove 3 Tables (qty 10 → 7) while DRAFT");
  const updated = (
    await apiOrThrow("PATCH", `/api/rental-orders/${created.id}`, {
      remarks: "Scenario 5 – removed 3 tables before delivery",
      items: [
        {
          productId: product.id,
          quantity: QTY_FINAL,
          dailyRate: DAILY_RATE,
        },
      ],
    })
  ).data;

  check("Remaining qty = 7", updated.items?.[0]?.quantity === QTY_FINAL, {
    quantity: updated.items?.[0]?.quantity,
  });
  check(
    "Total updated after remove = 1,400",
    orderLineTotal(updated) === EXPECTED_TOTAL_FINAL,
    {
      total: orderLineTotal(updated),
      expected: EXPECTED_TOTAL_FINAL,
      formula: `${QTY_FINAL} × ${DAILY_RATE} × ${RENTAL_DAYS}`,
      delta: EXPECTED_TOTAL_FINAL - EXPECTED_TOTAL_INITIAL,
    },
  );

  const invAfterRemove = await getInventory(product.id, warehouse.id);
  check(
    "Inventory reserved unchanged by remove while DRAFT",
    (invAfterRemove?.reservedQuantity ?? 0) === reservedBaseline,
    {
      reservedBefore: reservedBaseline,
      reservedAfter: invAfterRemove?.reservedQuantity,
      note: "Stock reservation only applies on /reserve",
    },
  );

  log("3. Confirm + reserve final qty 7 (inventory should reserve 7, not 10)");
  await apiOrThrow("POST", `/api/rental-orders/${created.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${created.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY_FINAL }],
    })
  ).data;

  check(
    "Order reservedQuantity = 7 (not 10)",
    reserved.items?.[0]?.reservedQuantity === QTY_FINAL,
    {
      reservedQuantity: reserved.items?.[0]?.reservedQuantity,
      orderQuantity: reserved.items?.[0]?.quantity,
    },
  );

  const invAfterReserve = await getInventory(product.id, warehouse.id);
  const reservedDelta =
    (invAfterReserve?.reservedQuantity ?? 0) - reservedBaseline;
  check(
    "Inventory reserved increased by 7 (removed qty not reserved)",
    reservedDelta === QTY_FINAL,
    {
      before: reservedBaseline,
      after: invAfterReserve?.reservedQuantity,
      delta: reservedDelta,
      available:
        invAfterReserve?.availableQuantity ??
        (invAfterReserve?.quantityOnHand ?? 0) -
          (invAfterReserve?.reservedQuantity ?? 0),
    },
  );

  log("4. Deliver + return + invoice using remaining 7");
  const orderItem = reserved.items?.[0];
  const dispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S5-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S5-001",
      driverName: "Scenario 5 Driver",
      driverPhone: "+92 301 5556666",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 5 delivery of 7 tables",
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity: QTY_FINAL,
        },
      ],
    })
  ).data;
  await apiOrThrow("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const dispatchDone = (
    await apiOrThrow("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  const dispatchItem = dispatchDone.items?.[0] ?? dispatch.items?.[0];

  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S5-${suffix}`,
      rentalOrderId: created.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Scenario 5 return",
      items: [
        {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchItem?.id ?? null,
          quantity: QTY_FINAL,
        },
      ],
    })
  ).data;
  await apiOrThrow("POST", `/api/returns/${ret.id}/receive`);
  await apiOrThrow("POST", `/api/returns/${ret.id}/inspect`, {
    items: [
      {
        rentalOrderItemId: orderItem.id,
        goodQuantity: QTY_FINAL,
        damagedQuantity: 0,
        lostQuantity: 0,
      },
    ],
  });
  await apiOrThrow("POST", `/api/returns/${ret.id}/complete`);

  const completed = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check("Order COMPLETED with qty 7", completed.status === "COMPLETED" && completed.items?.[0]?.quantity === QTY_FINAL, {
    status: completed.status,
    quantity: completed.items?.[0]?.quantity,
  });

  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S5-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-08-05",
      notes: "Scenario 5 invoice after removing 3 tables",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Table rental × ${QTY_FINAL}`,
          quantity: QTY_FINAL,
          unitPrice: DAILY_RATE * RENTAL_DAYS,
          sortOrder: 0,
        },
      ],
    })
  ).data;

  check("Invoice qty = 7", invoice.items?.[0]?.quantity === QTY_FINAL, {
    quantity: invoice.items?.[0]?.quantity,
  });
  check("Invoice total = 1,400", Number(invoice.grandTotal) === EXPECTED_TOTAL_FINAL, {
    grandTotal: invoice.grandTotal,
    expected: EXPECTED_TOTAL_FINAL,
  });

  const issued = (
    await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`)
  ).data;

  const summary = {
    result: "PASS",
    answers: {
      totalsUpdatedCorrectly: true,
      inventoryUpdatedCorrectly:
        "Qty remove in DRAFT updates order total only. Inventory reserved +7 on reserve (not +10).",
    },
    orderNumber,
    rentalOrderId: created.id,
    invoiceId: issued.id,
    quantities: {
      ordered: QTY_INITIAL,
      removed: QTY_REMOVED,
      remaining: QTY_FINAL,
    },
    totals: {
      initial: EXPECTED_TOTAL_INITIAL,
      afterRemove: orderLineTotal(updated),
      invoiceGrandTotal: issued.grandTotal,
    },
    inventory: {
      reservedBaseline,
      reservedAfterRemoveEdit: invAfterRemove?.reservedQuantity,
      reservedAfterReserve: invAfterReserve?.reservedQuantity,
      deltaOnReserve: reservedDelta,
    },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
    },
  };

  console.log("\n========== SCENARIO 5 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 5 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
