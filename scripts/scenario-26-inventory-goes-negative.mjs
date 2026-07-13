/**
 * Scenario 26 – Inventory Goes Negative
 *
 * Available: 50 Chairs
 * Try renting: 60 Chairs
 * System should prevent negative inventory.
 *
 * Usage: node --env-file=.env scripts/scenario-26-inventory-goes-negative.mjs
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

const AVAILABLE = 50;
const RENT_ATTEMPT = 60;
const DAILY_RATE = 50;
const START_DATE = "2026-09-07";
const END_DATE = "2026-09-08";

const PRODUCT = {
  productCode: "CHAIR-S26",
  name: "Chair S26",
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

function availableOf(row) {
  if (row == null) return 0;
  if (row.availableQuantity != null) return Number(row.availableQuantity);
  return Number(row.quantityOnHand ?? 0) - Number(row.reservedQuantity ?? 0);
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
        customerCode: `CUST-S26-${stamp()}`,
        name: "Scenario 26 Customer",
        phone: "+92 300 2626262",
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
        warehouseCode: `WH-S26-${stamp()}`,
        name: "Scenario 26 Warehouse",
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
  let product = products.find((p) => p.productCode === PRODUCT.productCode) ?? null;
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
        maximumStock: Math.max(targetAvailable * 2, 200),
        isActive: true,
      })
    ).data;
  } else {
    // Prefer clean slate: set on-hand = target, reserved = 0 when API allows
    try {
      row = (
        await apiOrThrow("PATCH", `/api/inventory/${row.id}`, {
          quantityOnHand: targetAvailable,
          reservedQuantity: 0,
        })
      ).data;
    } catch {
      const reserved = row.reservedQuantity ?? 0;
      row = (
        await apiOrThrow("PATCH", `/api/inventory/${row.id}`, {
          quantityOnHand: reserved + targetAvailable,
        })
      ).data;
    }
  }
  return { row, available: availableOf(row) };
}

async function main() {
  const suffix = stamp();

  log("Scenario 26 – Inventory Goes Negative", {
    available: AVAILABLE,
    rentAttempt: RENT_ATTEMPT,
    expected: "REJECT reserve — no negative inventory",
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();

  log("1. Set available stock to 50 chairs");
  const { available: availableBefore, row: invBefore } = await setAvailableStock(
    product.id,
    warehouse.id,
    AVAILABLE,
  );
  check("Available = 50", availableBefore === AVAILABLE, {
    available: availableBefore,
    quantityOnHand: invBefore.quantityOnHand,
    reservedQuantity: invBefore.reservedQuantity,
  });

  log("2. Create + confirm order for 60 chairs");
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S26-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 26 – attempt rent 60 with only 50 available",
      items: [
        { productId: product.id, quantity: RENT_ATTEMPT, dailyRate: DAILY_RATE },
      ],
    })
  ).data;
  await apiOrThrow("POST", `/api/rental-orders/${order.id}/confirm`);

  observe("Order create/confirm allowed without stock check", {
    orderId: order.id,
    quantity: RENT_ATTEMPT,
  });

  const invAfterConfirm = await getInventory(product.id, warehouse.id);
  check(
    "Available still 50 after confirm (no reserve yet)",
    availableOf(invAfterConfirm) === AVAILABLE,
    { available: availableOf(invAfterConfirm) },
  );

  log("3. Attempt reserve of 60 (should be blocked)");
  const reserve = await api("POST", `/api/rental-orders/${order.id}/reserve`, {
    items: [{ productId: product.id, quantity: RENT_ATTEMPT }],
  });

  check("Reserve of 60 REJECTED", reserve.ok === false, {
    httpStatus: reserve.status,
    error: reserve.json?.error,
  });

  const msg = String(reserve.json?.error?.message ?? "");
  check(
    "Error cites insufficient available quantity",
    msg.toLowerCase().includes("insufficient") ||
      msg.toLowerCase().includes("available"),
    { message: msg },
  );

  const invAfterFail = await getInventory(product.id, warehouse.id);
  const availableAfter = availableOf(invAfterFail);
  check("Available still 50 (not negative)", availableAfter === AVAILABLE, {
    available: availableAfter,
    quantityOnHand: invAfterFail?.quantityOnHand,
    reservedQuantity: invAfterFail?.reservedQuantity,
  });
  check(
    "Inventory did not go negative",
    availableAfter >= 0 &&
      Number(invAfterFail?.quantityOnHand ?? 0) >= 0 &&
      Number(invAfterFail?.reservedQuantity ?? 0) >= 0 &&
      Number(invAfterFail?.reservedQuantity ?? 0) <=
        Number(invAfterFail?.quantityOnHand ?? 0),
    {
      quantityOnHand: invAfterFail?.quantityOnHand,
      reservedQuantity: invAfterFail?.reservedQuantity,
      available: availableAfter,
    },
  );

  log("4. Control — reserve of 50 should succeed");
  const reserveOk = await api("POST", `/api/rental-orders/${order.id}/reserve`, {
    items: [{ productId: product.id, quantity: AVAILABLE }],
  });
  check("Reserve of 50 ACCEPTED", reserveOk.ok === true, {
    httpStatus: reserveOk.status,
    status: reserveOk.json?.data?.status,
    reservedQuantity: reserveOk.json?.data?.items?.[0]?.reservedQuantity,
    error: reserveOk.json?.error ?? null,
  });

  const invAfterOk = await getInventory(product.id, warehouse.id);
  check("Available = 0 after successful reserve of 50", availableOf(invAfterOk) === 0, {
    available: availableOf(invAfterOk),
    reservedQuantity: invAfterOk?.reservedQuantity,
  });

  const summary = {
    result: "PASS",
    answer: {
      preventsNegativeInventory: true,
      blockedAt: "reserve",
      createConfirmChecksStock: false,
      error: reserve.json?.error?.message,
    },
    availableBefore: AVAILABLE,
    rentAttempt: RENT_ATTEMPT,
    orderId: order.id,
    checks,
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      inventory: `${BASE}/inventory/${invBefore.id}`,
    },
  };

  console.log("\n========== SCENARIO 26 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 26 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
