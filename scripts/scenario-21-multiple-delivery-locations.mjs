/**
 * Scenario 21 – Multiple Delivery Locations
 *
 * Single order:
 *   100 Chairs to Hall A
 *    50 Chairs to Hall B
 * Check: Multiple delivery addresses
 *
 * Usage: node --env-file=.env scripts/scenario-21-multiple-delivery-locations.mjs
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

const QTY_TOTAL = 150;
const QTY_HALL_A = 100;
const QTY_HALL_B = 50;
const DAILY_RATE = 50;
const START_DATE = "2026-08-30";
const END_DATE = "2026-08-31";

const HALL_A = "Hall A – Banquet Wing, Expo Center Lahore";
const HALL_B = "Hall B – Outdoor Lawn, Expo Center Lahore";

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 200,
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
  if (!response.ok) {
    const err = new Error(
      `${method} ${path} -> ${response.status}: ${JSON.stringify(json)}`,
    );
    err.status = response.status;
    err.body = json;
    throw err;
  }
  return json;
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
  const customers = listItems(await api("GET", "/api/customers?pageSize=50"));
  let customer = customers.find((c) => c.isActive !== false) ?? customers[0];
  if (!customer) {
    customer = (
      await api("POST", "/api/customers", {
        customerCode: `CUST-S21-${stamp()}`,
        name: "Scenario 21 Customer",
        phone: "+92 300 2121212",
        address: "Lahore, Pakistan",
        isActive: true,
      })
    ).data;
  }
  return customer;
}

async function ensureWarehouse() {
  const warehouses = listItems(await api("GET", "/api/warehouses?pageSize=50"));
  let warehouse = warehouses.find((w) => w.isActive !== false) ?? warehouses[0];
  if (!warehouse) {
    warehouse = (
      await api("POST", "/api/warehouses", {
        warehouseCode: `WH-S21-${stamp()}`,
        name: "Scenario 21 Warehouse",
        isActive: true,
      })
    ).data;
  }
  return warehouse;
}

async function ensureProduct() {
  const products = listItems(
    await api(
      "GET",
      `/api/products?pageSize=100&search=${encodeURIComponent(PRODUCT.productCode)}`,
    ),
  );
  let product =
    products.find((p) => p.productCode === PRODUCT.productCode) ??
    products.find((p) => p.name?.toLowerCase() === PRODUCT.name.toLowerCase());
  if (!product) {
    product = (
      await api("POST", "/api/products", {
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
  const inventories = listItems(await api("GET", "/api/inventory?pageSize=100"));
  let row = inventories.find(
    (i) => i.productId === productId && i.warehouseId === warehouseId,
  );
  if (!row) {
    return (
      await api("POST", "/api/inventory", {
        productId,
        warehouseId,
        quantityOnHand: minAvailable,
        reservedQuantity: 0,
        minimumStock: 0,
        maximumStock: Math.max(minAvailable * 2, 400),
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
      await api("PATCH", `/api/inventory/${row.id}`, {
        quantityOnHand: Math.max(neededOnHand, row.quantityOnHand ?? 0, minAvailable),
      })
    ).data;
  }
  return row;
}

async function createAndCompleteDispatch({
  suffix,
  label,
  orderId,
  productId,
  orderItemId,
  quantity,
  deliveryAddress,
  date,
}) {
  const dispatch = (
    await api("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S21${label}-${suffix}`,
      rentalOrderId: orderId,
      dispatchDate: date,
      deliveryMethod: "DELIVERY",
      vehicleNumber: `LES-S21-${label}`,
      driverName: `Scenario 21 Driver ${label}`,
      driverPhone: "+92 301 2121212",
      deliveryAddress,
      remarks: `${quantity} chairs → ${label}`,
      items: [
        {
          productId,
          rentalOrderItemId: orderItemId,
          quantity,
        },
      ],
    })
  ).data;

  await api("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const done = (await api("POST", `/api/dispatches/${dispatch.id}/complete`)).data;
  return done;
}

async function main() {
  const suffix = stamp();

  log("Scenario 21 – Multiple Delivery Locations", {
    orderQty: QTY_TOTAL,
    hallA: { qty: QTY_HALL_A, address: HALL_A },
    hallB: { qty: QTY_HALL_B, address: HALL_B },
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Single order for 150 chairs");
  const order = (
    await api("POST", "/api/rental-orders", {
      orderNumber: `RO-S21-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 21 – Hall A (100) + Hall B (50)",
      items: [
        {
          productId: product.id,
          quantity: QTY_TOTAL,
          dailyRate: DAILY_RATE,
        },
      ],
    })
  ).data;

  observe("Order-level delivery address field", {
    hasDeliveryAddress: Object.prototype.hasOwnProperty.call(order, "deliveryAddress"),
    deliveryAddress: order.deliveryAddress ?? null,
    note: "Addresses live on dispatches, not order lines",
  });

  await api("POST", `/api/rental-orders/${order.id}/confirm`);
  const reserved = (
    await api("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY_TOTAL }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  check("Single order reserved 150 chairs", Number(orderItem?.reservedQuantity) === QTY_TOTAL, {
    reservedQuantity: orderItem?.reservedQuantity,
  });

  log("2. Delivery 1 — 100 chairs to Hall A");
  const dnA = await createAndCompleteDispatch({
    suffix,
    label: "A",
    orderId: order.id,
    productId: product.id,
    orderItemId: orderItem.id,
    quantity: QTY_HALL_A,
    deliveryAddress: HALL_A,
    date: START_DATE,
  });

  check("Hall A dispatch COMPLETED", dnA.status === "COMPLETED", {
    status: dnA.status,
    qty: dnA.items?.[0]?.quantity,
  });
  check("Hall A deliveryAddress saved", dnA.deliveryAddress === HALL_A, {
    deliveryAddress: dnA.deliveryAddress,
  });

  log("3. Delivery 2 — 50 chairs to Hall B");
  const dnB = await createAndCompleteDispatch({
    suffix,
    label: "B",
    orderId: order.id,
    productId: product.id,
    orderItemId: orderItem.id,
    quantity: QTY_HALL_B,
    deliveryAddress: HALL_B,
    date: START_DATE,
  });

  check("Hall B dispatch COMPLETED", dnB.status === "COMPLETED", {
    status: dnB.status,
    qty: dnB.items?.[0]?.quantity,
  });
  check("Hall B deliveryAddress saved", dnB.deliveryAddress === HALL_B, {
    deliveryAddress: dnB.deliveryAddress,
  });

  log("4. Verify multiple addresses on one order");
  const dispatches = listItems(
    await api("GET", `/api/dispatches?pageSize=100&rentalOrderId=${order.id}`),
  ).filter((d) => d.status === "COMPLETED");

  check("Two completed delivery notes for same order", dispatches.length >= 2, {
    count: dispatches.length,
    addresses: dispatches.map((d) => ({
      dispatchNumber: d.dispatchNumber,
      qty: (d.items ?? []).reduce((s, i) => s + Number(i.quantity), 0),
      deliveryAddress: d.deliveryAddress,
    })),
  });

  const addresses = new Set(dispatches.map((d) => d.deliveryAddress));
  check("Distinct delivery addresses (Hall A ≠ Hall B)", addresses.size >= 2, {
    addresses: [...addresses],
  });
  check("Hall A address present", addresses.has(HALL_A), { addresses: [...addresses] });
  check("Hall B address present", addresses.has(HALL_B), { addresses: [...addresses] });

  const qtyA =
    dispatches.find((d) => d.deliveryAddress === HALL_A)?.items?.[0]?.quantity ??
    null;
  const qtyB =
    dispatches.find((d) => d.deliveryAddress === HALL_B)?.items?.[0]?.quantity ??
    null;
  check("Hall A qty = 100", Number(qtyA) === QTY_HALL_A, { qty: qtyA });
  check("Hall B qty = 50", Number(qtyB) === QTY_HALL_B, { qty: qtyB });

  const orderAfter = (await api("GET", `/api/rental-orders/${order.id}`)).data;
  observe("Order status after both deliveries", { status: orderAfter.status });

  const summary = {
    result: "PASS",
    answer: {
      multipleDeliveryAddressesSupported: true,
      how: "One rental order → multiple dispatches, each with its own deliveryAddress",
      orderLineAddressSupported: false,
      locations: [
        { hall: "A", qty: QTY_HALL_A, address: HALL_A, dispatchId: dnA.id },
        { hall: "B", qty: QTY_HALL_B, address: HALL_B, dispatchId: dnB.id },
      ],
    },
    orderId: order.id,
    checks,
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      hallA: `${BASE}/dispatches/${dnA.id}`,
      hallB: `${BASE}/dispatches/${dnB.id}`,
    },
  };

  console.log("\n========== SCENARIO 21 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 21 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
