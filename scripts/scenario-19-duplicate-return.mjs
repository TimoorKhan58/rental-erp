/**
 * Scenario 19 – Duplicate Return
 *
 * Items already returned.
 * Staff tries returning them again.
 * Check: Duplicate prevention
 *
 * Usage: node --env-file=.env scripts/scenario-19-duplicate-return.mjs
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
const START_DATE = "2026-08-24";
const END_DATE = "2026-08-25";

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
        customerCode: `CUST-S19-${stamp()}`,
        name: "Scenario 19 Customer",
        phone: "+92 300 1919191",
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
        warehouseCode: `WH-S19-${stamp()}`,
        name: "Scenario 19 Warehouse",
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

async function completeReturn({
  suffix,
  orderId,
  dispatchId,
  orderItemId,
  dispatchItemId,
  quantity,
  date,
}) {
  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S19-${suffix}`,
      rentalOrderId: orderId,
      dispatchId,
      returnDate: date,
      remarks: `Scenario 19 first return: ${quantity}`,
      items: [
        {
          rentalOrderItemId: orderItemId,
          dispatchItemId,
          quantity,
        },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/returns/${ret.id}/receive`);
  await apiOrThrow("POST", `/api/returns/${ret.id}/inspect`, {
    items: [
      {
        rentalOrderItemId: orderItemId,
        goodQuantity: quantity,
        damagedQuantity: 0,
        lostQuantity: 0,
      },
    ],
  });
  return (await apiOrThrow("POST", `/api/returns/${ret.id}/complete`)).data;
}

async function main() {
  const suffix = stamp();

  log("Scenario 19 – Duplicate Return", {
    qty: QTY,
    expected: "Second return of already-returned items REJECTED",
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Order, deliver, and fully return once");
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S19-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 19 – duplicate return prevention",
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
      dispatchNumber: `DSP-S19-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S19-001",
      driverName: "Scenario 19 Driver",
      driverPhone: "+92 301 1919191",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Full delivery",
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

  const firstReturn = await completeReturn({
    suffix,
    orderId: order.id,
    dispatchId: dispatch.id,
    orderItemId: orderItem.id,
    dispatchItemId: dispatchItem.id,
    quantity: QTY,
    date: END_DATE,
  });

  check("First return COMPLETED", firstReturn.status === "COMPLETED", {
    status: firstReturn.status,
    qty: firstReturn.items?.[0]?.quantity,
  });

  const orderAfter = (await apiOrThrow("GET", `/api/rental-orders/${order.id}`)).data;
  observe("Order status after full return", { status: orderAfter.status });

  log("2. Staff tries returning the same items again (new return note)");
  const dupReturn = await api("POST", "/api/returns", {
    returnNumber: `RET-S19-DUP-${suffix}`,
    rentalOrderId: order.id,
    dispatchId: dispatch.id,
    returnDate: END_DATE,
    remarks: "Duplicate return attempt",
    items: [
      {
        rentalOrderItemId: orderItem.id,
        dispatchItemId: dispatchItem.id,
        quantity: QTY,
      },
    ],
  });

  check("System REJECTS duplicate return of already-returned qty", dupReturn.ok === false, {
    httpStatus: dupReturn.status,
    error: dupReturn.json?.error,
  });

  const msg = String(dupReturn.json?.error?.message ?? "");
  check(
    "Error cites exceeding remaining dispatched quantity",
    msg.toLowerCase().includes("exceed") ||
      msg.toLowerCase().includes("remaining") ||
      msg.toLowerCase().includes("dispatched"),
    { message: msg },
  );

  log("3. Related — re-complete the same already-completed return");
  const reComplete = await api("POST", `/api/returns/${firstReturn.id}/complete`);
  observe("Re-complete same return", {
    blocked: reComplete.ok === false,
    httpStatus: reComplete.status,
    error: reComplete.json?.error ?? null,
    status: reComplete.json?.data?.status ?? null,
  });

  const summary = {
    result: "PASS",
    answer: {
      duplicateReturnNoteBlocked: true,
      error: dupReturn.json?.error?.message,
      sameReturnReCompleteBlocked: reComplete.ok === false,
      sameReturnReCompleteError: reComplete.json?.error?.message ?? null,
    },
    orderId: order.id,
    dispatchId: dispatch.id,
    returnId: firstReturn.id,
    checks,
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      dispatch: `${BASE}/dispatches/${dispatch.id}`,
      return: `${BASE}/returns/${firstReturn.id}`,
    },
  };

  console.log("\n========== SCENARIO 19 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 19 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
