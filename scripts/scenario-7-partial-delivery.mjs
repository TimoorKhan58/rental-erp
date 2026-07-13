/**
 * Scenario 7 – Partial Delivery
 *
 * Customer ordered 100 Chairs.
 * Only 80 delivered, remaining 20 delivered later.
 * Check: multiple delivery records + pending quantity tracking.
 *
 * Usage: node --env-file=.env scripts/scenario-7-partial-delivery.mjs
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

const QTY_ORDERED = 100;
const QTY_FIRST = 80;
const QTY_SECOND = 20;
const DAILY_RATE = 50;
const START_DATE = "2026-08-01";
const END_DATE = "2026-08-02";

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 150,
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
        customerCode: `CUST-S7-${stamp()}`,
        name: "Scenario 7 Customer",
        phone: "+92 300 7778899",
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
        warehouseCode: `WH-S7-${stamp()}`,
        name: "Scenario 7 Warehouse",
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
        maximumStock: Math.max(minAvailable * 2, 300),
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

async function listDispatches(orderId) {
  return listItems(
    await api("GET", `/api/dispatches?pageSize=100&rentalOrderId=${orderId}`),
  );
}

function dispatchQty(dispatch) {
  return (dispatch.items ?? []).reduce((sum, i) => sum + Number(i.quantity), 0);
}

function completedDispatchedTotal(dispatches) {
  return dispatches
    .filter((d) => d.status === "COMPLETED")
    .reduce((sum, d) => sum + dispatchQty(d), 0);
}

/** Pending = reserved on order lines − completed dispatch qty (computed; not an API field). */
function computePending(order, dispatches) {
  const reserved = (order.items ?? []).reduce(
    (sum, i) => sum + Number(i.reservedQuantity ?? 0),
    0,
  );
  const ordered = (order.items ?? []).reduce(
    (sum, i) => sum + Number(i.quantity ?? 0),
    0,
  );
  const delivered = completedDispatchedTotal(dispatches);
  return {
    ordered,
    reserved,
    delivered,
    pendingVsReserved: Math.max(reserved - delivered, 0),
    pendingVsOrdered: Math.max(ordered - delivered, 0),
    orderHasPendingField: Object.prototype.hasOwnProperty.call(
      order,
      "pendingQuantity",
    ),
    itemHasPendingField: Object.prototype.hasOwnProperty.call(
      order.items?.[0] ?? {},
      "pendingQuantity",
    ),
    itemHasDispatchedField: Object.prototype.hasOwnProperty.call(
      order.items?.[0] ?? {},
      "dispatchedQuantity",
    ),
  };
}

async function createAndCompleteDispatch({
  suffix,
  label,
  orderId,
  productId,
  orderItemId,
  quantity,
  customer,
  date,
}) {
  const dispatch = (
    await api("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S7${label}-${suffix}`,
      rentalOrderId: orderId,
      dispatchDate: date,
      deliveryMethod: "DELIVERY",
      vehicleNumber: `LES-S7-${label}`,
      driverName: "Scenario 7 Driver",
      driverPhone: "+92 301 7778888",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: `Scenario 7 delivery ${label}: ${quantity} chairs`,
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
  const done = (
    await api("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  return done;
}

async function main() {
  const suffix = stamp();

  log("Scenario 7 – Partial Delivery", {
    ordered: QTY_ORDERED,
    firstDelivery: QTY_FIRST,
    secondDelivery: QTY_SECOND,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Order 100 Chairs → confirm → reserve");
  const orderNumber = `RO-S7-${suffix}`;
  const created = (
    await api("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 7 – partial delivery 80 then 20",
      items: [
        {
          productId: product.id,
          quantity: QTY_ORDERED,
          dailyRate: DAILY_RATE,
        },
      ],
    })
  ).data;

  await api("POST", `/api/rental-orders/${created.id}/confirm`);
  const reserved = (
    await api("POST", `/api/rental-orders/${created.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY_ORDERED }],
    })
  ).data;
  const orderItem = reserved.items?.[0];
  check("Reserved 100 chairs", orderItem?.reservedQuantity === QTY_ORDERED, {
    reservedQuantity: orderItem?.reservedQuantity,
  });

  log("2. First delivery: 80 chairs");
  const first = await createAndCompleteDispatch({
    suffix,
    label: "A",
    orderId: created.id,
    productId: product.id,
    orderItemId: orderItem.id,
    quantity: QTY_FIRST,
    customer,
    date: START_DATE,
  });
  check("First dispatch COMPLETED with qty 80", first.status === "COMPLETED" && dispatchQty(first) === QTY_FIRST, {
    status: first.status,
    qty: dispatchQty(first),
  });

  const orderAfterFirst = (await api("GET", `/api/rental-orders/${created.id}`)).data;
  const dispatchesAfterFirst = await listDispatches(created.id);
  const pendingAfterFirst = computePending(orderAfterFirst, dispatchesAfterFirst);

  check(
    "Order status DISPATCHED after partial delivery",
    orderAfterFirst.status === "DISPATCHED",
    { status: orderAfterFirst.status },
  );
  check("One delivery record after first ship", dispatchesAfterFirst.length === 1, {
    count: dispatchesAfterFirst.length,
  });
  check(
    "Pending vs reserved = 20 after first delivery",
    pendingAfterFirst.pendingVsReserved === QTY_SECOND,
    pendingAfterFirst,
  );
  observe("Pending quantity API fields", {
    orderHasPendingField: pendingAfterFirst.orderHasPendingField,
    itemHasPendingField: pendingAfterFirst.itemHasPendingField,
    itemHasDispatchedField: pendingAfterFirst.itemHasDispatchedField,
    note: "No native pendingQuantity on order API — derived from reserved − completed dispatches",
  });

  log("3. Second delivery: remaining 20 chairs");
  const second = await createAndCompleteDispatch({
    suffix,
    label: "B",
    orderId: created.id,
    productId: product.id,
    orderItemId: orderItem.id,
    quantity: QTY_SECOND,
    customer,
    date: END_DATE,
  });
  check("Second dispatch COMPLETED with qty 20", second.status === "COMPLETED" && dispatchQty(second) === QTY_SECOND, {
    status: second.status,
    qty: dispatchQty(second),
  });

  const orderAfterSecond = (await api("GET", `/api/rental-orders/${created.id}`)).data;
  const dispatchesAfterSecond = await listDispatches(created.id);
  const pendingAfterSecond = computePending(orderAfterSecond, dispatchesAfterSecond);

  check(
    "Multiple delivery records (2)",
    dispatchesAfterSecond.length === 2,
    {
      count: dispatchesAfterSecond.length,
      records: dispatchesAfterSecond.map((d) => ({
        number: d.dispatchNumber,
        status: d.status,
        qty: dispatchQty(d),
      })),
    },
  );
  check(
    "Delivered total = 100 (80 + 20)",
    pendingAfterSecond.delivered === QTY_ORDERED,
    { delivered: pendingAfterSecond.delivered },
  );
  check(
    "Pending vs reserved = 0 after full delivery",
    pendingAfterSecond.pendingVsReserved === 0,
    pendingAfterSecond,
  );
  check(
    "Order status ON_RENT after full delivery",
    orderAfterSecond.status === "ON_RENT",
    { status: orderAfterSecond.status },
  );

  const summary = {
    result: "PASS",
    answers: {
      multipleDeliveryRecords: true,
      pendingQuantityTracking:
        "Partial support — order status DISPATCHED→ON_RENT tracks partial vs full, but no pendingQuantity field; pending must be computed as reserved − sum(completed dispatch qty).",
    },
    orderNumber,
    rentalOrderId: created.id,
    deliveries: dispatchesAfterSecond.map((d) => ({
      id: d.id,
      number: d.dispatchNumber,
      status: d.status,
      qty: dispatchQty(d),
      url: `${BASE}/dispatches/${d.id}`,
    })),
    tracking: {
      afterFirst: pendingAfterFirst,
      afterSecond: pendingAfterSecond,
    },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
    },
  };

  console.log("\n========== SCENARIO 7 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 7 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
