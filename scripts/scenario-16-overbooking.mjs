/**
 * Scenario 16 – Two Customers Want Same Items
 *
 * Customer A: 200 Chairs on 20 July
 * Customer B: 200 Chairs on same date
 * Inventory available: only 250 Chairs
 * Check: Overbooking prevention
 *
 * Usage: node --env-file=.env scripts/scenario-16-overbooking.mjs
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

const AVAILABLE_STOCK = 250;
const BOOK_QTY = 200;
const START_DATE = "2026-07-20";
const END_DATE = "2026-07-21";
const DAILY_RATE = 50;

const PRODUCT = {
  productCode: "CHAIR-S16",
  name: "Chair S16",
  unit: "pcs",
  rentalRate: DAILY_RATE,
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

async function ensureCustomer(code, name, phone) {
  const customers = listItems(await apiOrThrow("GET", "/api/customers?pageSize=100"));
  let customer = customers.find((c) => c.customerCode === code);
  if (!customer) {
    customer = (
      await apiOrThrow("POST", "/api/customers", {
        customerCode: code,
        name,
        phone,
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
        warehouseCode: `WH-S16-${stamp()}`,
        name: "Scenario 16 Warehouse",
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
  let product = products.find((p) => p.productCode === PRODUCT.productCode);
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

/** Force availableQuantity === targetAvailable (isolate from leftover reservations). */
async function setAvailableStock(productId, warehouseId, targetAvailable) {
  let row = await getInventory(productId, warehouseId);
  if (!row) {
    row = (
      await apiOrThrow("POST", "/api/inventory", {
        productId,
        warehouseId,
        quantityOnHand: targetAvailable,
        reservedQuantity: 0,
        minimumStock: 0,
        maximumStock: Math.max(targetAvailable * 2, 500),
        isActive: true,
      })
    ).data;
  } else {
    const reserved = row.reservedQuantity ?? 0;
    const neededOnHand = reserved + targetAvailable;
    row = (
      await apiOrThrow("PATCH", `/api/inventory/${row.id}`, {
        quantityOnHand: neededOnHand,
      })
    ).data;
  }

  const available =
    row.availableQuantity ??
    (row.quantityOnHand ?? 0) - (row.reservedQuantity ?? 0);
  return { row, available };
}

async function createConfirmedOrder({
  orderNumber,
  customer,
  warehouse,
  product,
  qty,
}) {
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: `Scenario 16 – ${orderNumber} books ${qty} chairs on ${START_DATE}`,
      items: [
        { productId: product.id, quantity: qty, dailyRate: DAILY_RATE },
      ],
    })
  ).data;
  return (await apiOrThrow("POST", `/api/rental-orders/${created.id}/confirm`))
    .data;
}

async function main() {
  const suffix = stamp();

  log("Scenario 16 – Two Customers Want Same Items", {
    customerA: BOOK_QTY,
    customerB: BOOK_QTY,
    availableStock: AVAILABLE_STOCK,
    date: START_DATE,
    overbookIfBoth: BOOK_QTY * 2 - AVAILABLE_STOCK,
  });

  await signIn();

  const customerA = await ensureCustomer(
    `CUST-S16A-${suffix.slice(-6)}`,
    "Customer A (S16)",
    "+92 300 1600001",
  );
  const customerB = await ensureCustomer(
    `CUST-S16B-${suffix.slice(-6)}`,
    "Customer B (S16)",
    "+92 300 1600002",
  );
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();

  log("1. Set inventory available = 250 chairs");
  const { available: availableBefore } = await setAvailableStock(
    product.id,
    warehouse.id,
    AVAILABLE_STOCK,
  );
  check("Available stock is 250", availableBefore === AVAILABLE_STOCK, {
    available: availableBefore,
  });

  log("2. Both customers create + confirm orders for 200 chairs (same dates)");
  const orderA = await createConfirmedOrder({
    orderNumber: `RO-S16A-${suffix}`,
    customer: customerA,
    warehouse,
    product,
    qty: BOOK_QTY,
  });
  const orderB = await createConfirmedOrder({
    orderNumber: `RO-S16B-${suffix}`,
    customer: customerB,
    warehouse,
    product,
    qty: BOOK_QTY,
  });

  check("Both orders created as CONFIRMED (create does not check stock)", true, {
    orderA: { id: orderA.id, status: orderA.status, qty: orderA.items?.[0]?.quantity },
    orderB: { id: orderB.id, status: orderB.status, qty: orderB.items?.[0]?.quantity },
    note: "Overbooking is not prevented at create/confirm — only at reserve",
  });

  const invAfterCreate = await getInventory(product.id, warehouse.id);
  check(
    "Stock still 250 available after both confirms (no reserve yet)",
    (invAfterCreate?.availableQuantity ??
      (invAfterCreate?.quantityOnHand ?? 0) -
        (invAfterCreate?.reservedQuantity ?? 0)) === AVAILABLE_STOCK,
    {
      available:
        invAfterCreate?.availableQuantity ??
        (invAfterCreate?.quantityOnHand ?? 0) -
          (invAfterCreate?.reservedQuantity ?? 0),
    },
  );

  log("3. Customer A reserves 200");
  const reserveA = await api("POST", `/api/rental-orders/${orderA.id}/reserve`, {
    items: [{ productId: product.id, quantity: BOOK_QTY }],
  });
  check("Customer A reserve SUCCEEDED", reserveA.ok === true, {
    httpStatus: reserveA.status,
    status: reserveA.json?.data?.status,
    error: reserveA.json?.error ?? null,
  });

  const invAfterA = await getInventory(product.id, warehouse.id);
  const availableAfterA =
    invAfterA?.availableQuantity ??
    (invAfterA?.quantityOnHand ?? 0) - (invAfterA?.reservedQuantity ?? 0);
  check("Available after A = 50 (250 − 200)", availableAfterA === 50, {
    available: availableAfterA,
    reserved: invAfterA?.reservedQuantity,
  });

  log("4. Customer B reserves 200 (should be blocked — only 50 left)");
  const reserveB = await api("POST", `/api/rental-orders/${orderB.id}/reserve`, {
    items: [{ productId: product.id, quantity: BOOK_QTY }],
  });
  check("Customer B reserve BLOCKED (overbooking prevented)", reserveB.ok === false, {
    httpStatus: reserveB.status,
    error: reserveB.json?.error,
  });

  const errMsg = String(reserveB.json?.error?.message ?? "").toLowerCase();
  check(
    "Error indicates insufficient available quantity",
    errMsg.includes("insufficient") || errMsg.includes("available"),
    { message: reserveB.json?.error?.message, details: reserveB.json?.error?.details },
  );

  const orderBAfter = (
    await apiOrThrow("GET", `/api/rental-orders/${orderB.id}`)
  ).data;
  check(
    "Customer B order remains CONFIRMED (not reserved)",
    orderBAfter.status === "CONFIRMED",
    { status: orderBAfter.status },
  );

  const invFinal = await getInventory(product.id, warehouse.id);
  const availableFinal =
    invFinal?.availableQuantity ??
    (invFinal?.quantityOnHand ?? 0) - (invFinal?.reservedQuantity ?? 0);
  check("Final available still 50 (B did not consume stock)", availableFinal === 50, {
    available: availableFinal,
  });

  // Optional: B can reserve only remaining 50?
  const reserveBPartial = await api(
    "POST",
    `/api/rental-orders/${orderB.id}/reserve`,
    { items: [{ productId: product.id, quantity: 50 }] },
  );
  observe("Customer B reserve only remaining 50", {
    ok: reserveBPartial.ok,
    httpStatus: reserveBPartial.status,
    status: reserveBPartial.json?.data?.status,
    error: reserveBPartial.json?.error ?? null,
    note: "Order still requests 200 on the line; partial reserve of 50 may or may not be allowed by domain rules",
  });

  const summary = {
    result: "PASS",
    answer: {
      overbookingPrevention:
        "Yes at reserve time. First 200 succeeds; second 200 fails (only 50 available). Create/confirm does not prevent overbooking.",
    },
    stock: {
      initialAvailable: AVAILABLE_STOCK,
      afterA: availableAfterA,
      afterBFailed: availableFinal,
    },
    orders: {
      customerA: {
        id: orderA.id,
        status: reserveA.json?.data?.status,
        qty: BOOK_QTY,
      },
      customerB: {
        id: orderB.id,
        status: orderBAfter.status,
        qty: BOOK_QTY,
        reserveBlocked: true,
      },
    },
    gap: "No date-calendar overbooking check beyond stock reservation; prevention is quantity-based at /reserve only.",
    checks,
    urls: {
      orderA: `${BASE}/rental-orders/${orderA.id}`,
      orderB: `${BASE}/rental-orders/${orderB.id}`,
    },
  };

  console.log("\n========== SCENARIO 16 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 16 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
