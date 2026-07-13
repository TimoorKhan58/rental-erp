/**
 * Scenario 17 – Return More Than Delivered
 *
 * Delivered: 80 Chairs
 * Returned: 90 Chairs
 * Expected: System rejects
 *
 * Usage: node --env-file=.env scripts/scenario-17-return-more-than-delivered.mjs
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

const QTY_DELIVERED = 80;
const QTY_RETURN_ATTEMPT = 90;
const DAILY_RATE = 50;
const START_DATE = "2026-08-20";
const END_DATE = "2026-08-21";

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
        customerCode: `CUST-S17-${stamp()}`,
        name: "Scenario 17 Customer",
        phone: "+92 300 1717171",
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
        warehouseCode: `WH-S17-${stamp()}`,
        name: "Scenario 17 Warehouse",
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

  log("Scenario 17 – Return More Than Delivered", {
    delivered: QTY_DELIVERED,
    returnAttempt: QTY_RETURN_ATTEMPT,
    expected: "REJECT",
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Order, reserve, and deliver 80 chairs");
  // Order 90 so we have capacity on order line, but only dispatch 80
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S17-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 17 – return 90 vs delivered 80",
      items: [
        {
          productId: product.id,
          quantity: QTY_RETURN_ATTEMPT,
          dailyRate: DAILY_RATE,
        },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/rental-orders/${order.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY_DELIVERED }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const dispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S17-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S17-001",
      driverName: "Scenario 17 Driver",
      driverPhone: "+92 301 1717171",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Delivered 80 chairs only",
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity: QTY_DELIVERED,
        },
      ],
    })
  ).data;
  await apiOrThrow("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const dispatchDone = (
    await apiOrThrow("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  const dispatchItem = dispatchDone.items?.[0] ?? dispatch.items?.[0];

  check("Delivered qty = 80", dispatchItem?.quantity === QTY_DELIVERED, {
    quantity: dispatchItem?.quantity,
  });

  log("2. Attempt return of 90 chairs (more than delivered)");
  const returnRes = await api("POST", "/api/returns", {
    returnNumber: `RET-S17-${suffix}`,
    rentalOrderId: order.id,
    dispatchId: dispatch.id,
    returnDate: END_DATE,
    remarks: "Attempt return 90 > delivered 80",
    items: [
      {
        rentalOrderItemId: orderItem.id,
        dispatchItemId: dispatchItem.id,
        quantity: QTY_RETURN_ATTEMPT,
      },
    ],
  });

  check("System REJECTS return of 90 when only 80 delivered", returnRes.ok === false, {
    httpStatus: returnRes.status,
    error: returnRes.json?.error,
  });

  const msg = String(returnRes.json?.error?.message ?? "");
  check(
    "Error message cites exceeding dispatched quantity",
    msg.toLowerCase().includes("exceed") ||
      msg.toLowerCase().includes("dispatched"),
    { message: msg },
  );

  // Control: return of exactly 80 should succeed
  log("3. Control — return of 80 (exact delivered) should succeed");
  const okReturn = await api("POST", "/api/returns", {
    returnNumber: `RET-S17-OK-${suffix}`,
    rentalOrderId: order.id,
    dispatchId: dispatch.id,
    returnDate: END_DATE,
    remarks: "Valid return of 80",
    items: [
      {
        rentalOrderItemId: orderItem.id,
        dispatchItemId: dispatchItem.id,
        quantity: QTY_DELIVERED,
      },
    ],
  });
  check("Return of 80 ACCEPTED", okReturn.ok === true, {
    httpStatus: okReturn.status,
    status: okReturn.json?.data?.status,
    error: okReturn.json?.error ?? null,
  });

  const summary = {
    result: "PASS",
    answer: {
      systemRejectsReturnMoreThanDelivered: true,
      error: returnRes.json?.error?.message,
    },
    delivered: QTY_DELIVERED,
    rejectedReturnQty: QTY_RETURN_ATTEMPT,
    orderId: order.id,
    dispatchId: dispatch.id,
    checks,
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      dispatch: `${BASE}/dispatches/${dispatch.id}`,
    },
  };

  console.log("\n========== SCENARIO 17 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 17 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
