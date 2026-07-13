/**
 * Scenario 18 – Duplicate Delivery
 *
 * Delivery already completed.
 * Staff accidentally clicks Deliver again.
 * Check: Duplicate prevention
 *
 * Usage: node --env-file=.env scripts/scenario-18-duplicate-delivery.mjs
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

const QTY = 50;
const DAILY_RATE = 50;
const START_DATE = "2026-08-22";
const END_DATE = "2026-08-23";

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 100,
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
        customerCode: `CUST-S18-${stamp()}`,
        name: "Scenario 18 Customer",
        phone: "+92 300 1818181",
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
        warehouseCode: `WH-S18-${stamp()}`,
        name: "Scenario 18 Warehouse",
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

async function ensureStock(productId, warehouseId, minAvailable) {
  const inventories = listItems(await apiOrThrow("GET", "/api/inventory?pageSize=100"));
  let row = inventories.find(
    (i) => i.productId === productId && i.warehouseId === warehouseId,
  );
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

async function main() {
  const suffix = stamp();

  log("Scenario 18 – Duplicate Delivery", {
    qty: QTY,
    expected: "Re-complete same DN rejected; duplicate DN blocked if possible",
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Order, reserve, and complete delivery once");
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S18-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 18 – duplicate delivery prevention",
      items: [{ productId: product.id, quantity: QTY, dailyRate: DAILY_RATE }],
    })
  ).data;

  await apiOrThrow("POST", `/api/rental-orders/${order.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const dispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S18-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S18-001",
      driverName: "Scenario 18 Driver",
      driverPhone: "+92 301 1818181",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "First (only intended) delivery",
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
  const completed = (
    await apiOrThrow("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;

  check("First delivery completed", completed.status === "COMPLETED", {
    status: completed.status,
  });

  const orderAfter = (await apiOrThrow("GET", `/api/rental-orders/${order.id}`)).data;
  observe("Order status after first delivery", {
    status: orderAfter.status,
    reservedQuantity: orderAfter.items?.[0]?.reservedQuantity,
  });

  log("2. Staff clicks Deliver again on the same dispatch");
  const reComplete = await api("POST", `/api/dispatches/${dispatch.id}/complete`);

  check("System REJECTS re-complete of already completed dispatch", reComplete.ok === false, {
    httpStatus: reComplete.status,
    error: reComplete.json?.error,
  });

  const reMsg = String(reComplete.json?.error?.message ?? "");
  check(
    "Error cites invalid status for complete/dispatch",
    reMsg.toLowerCase().includes("cannot") ||
      reMsg.toLowerCase().includes("status") ||
      reMsg.toLowerCase().includes("completed"),
    { message: reMsg },
  );

  log("3. Related — create a second dispatch for the same already-delivered qty");
  const secondDn = await api("POST", "/api/dispatches", {
    dispatchNumber: `DSP-S18-DUP-${suffix}`,
    rentalOrderId: order.id,
    dispatchDate: START_DATE,
    deliveryMethod: "DELIVERY",
    vehicleNumber: "LES-S18-002",
    driverName: "Scenario 18 Driver 2",
    driverPhone: "+92 301 1818182",
    deliveryAddress: customer.address ?? "Customer site",
    remarks: "Accidental duplicate delivery note",
    items: [
      {
        productId: product.id,
        rentalOrderItemId: orderItem.id,
        quantity: QTY,
      },
    ],
  });

  const secondBlocked = secondDn.ok === false;
  observe("Second delivery note for same qty", {
    blocked: secondBlocked,
    httpStatus: secondDn.status,
    status: secondDn.json?.data?.status ?? null,
    error: secondDn.json?.error ?? null,
  });

  let secondCompleteBlocked = null;
  if (secondDn.ok) {
    const secondId = secondDn.json.data.id;
    await apiOrThrow("PATCH", `/api/dispatches/${secondId}`, { markReady: true });
    const secondComplete = await api("POST", `/api/dispatches/${secondId}/complete`);
    secondCompleteBlocked = secondComplete.ok === false;
    observe("Second dispatch complete attempt", {
      blocked: secondCompleteBlocked,
      httpStatus: secondComplete.status,
      status: secondComplete.json?.data?.status ?? null,
      error: secondComplete.json?.error ?? null,
    });
  }

  const duplicatePreventedOnSameDn = reComplete.ok === false;
  const duplicatePreventedOnNewDn =
    secondBlocked || secondCompleteBlocked === true;

  const summary = {
    result: duplicatePreventedOnSameDn ? "PASS" : "FAIL",
    answer: {
      sameDispatchReCompleteBlocked: duplicatePreventedOnSameDn,
      sameDispatchError: reComplete.json?.error?.message ?? null,
      secondDispatchNoteBlocked: secondBlocked,
      secondDispatchCompleteBlocked: secondCompleteBlocked,
      fullDuplicateDeliveryPrevented: duplicatePreventedOnSameDn && duplicatePreventedOnNewDn,
      gap:
        duplicatePreventedOnSameDn && !duplicatePreventedOnNewDn
          ? "Re-click Deliver on same DN is blocked, but a new dispatch for already-delivered qty may still be created/completed (checks reserved qty, not remaining undelivered)."
          : null,
    },
    orderId: order.id,
    dispatchId: dispatch.id,
    checks,
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      dispatch: `${BASE}/dispatches/${dispatch.id}`,
    },
  };

  console.log("\n========== SCENARIO 18 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));

  if (summary.result !== "PASS") process.exit(1);
}

main().catch((error) => {
  console.error("\nSCENARIO 18 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
