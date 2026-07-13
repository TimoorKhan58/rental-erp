/**
 * Scenario 8 – Partial Return
 *
 * Delivered 100 Chairs → Returned 70 → Remaining 30 out.
 * Check: order stays open until everything is returned.
 *
 * Usage: node --env-file=.env scripts/scenario-8-partial-return.mjs
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

const QTY = 100;
const QTY_RETURN_1 = 70;
const QTY_REMAINING = 30;
const DAILY_RATE = 50;
const START_DATE = "2026-08-03";
const END_DATE = "2026-08-04";

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
        customerCode: `CUST-S8-${stamp()}`,
        name: "Scenario 8 Customer",
        phone: "+92 300 8889900",
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
        warehouseCode: `WH-S8-${stamp()}`,
        name: "Scenario 8 Warehouse",
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

async function completeReturn({
  suffix,
  label,
  orderId,
  dispatchId,
  orderItemId,
  dispatchItemId,
  quantity,
  date,
}) {
  const ret = (
    await api("POST", "/api/returns", {
      returnNumber: `RET-S8${label}-${suffix}`,
      rentalOrderId: orderId,
      dispatchId,
      returnDate: date,
      remarks: `Scenario 8 return ${label}: ${quantity} chairs`,
      items: [
        {
          rentalOrderItemId: orderItemId,
          dispatchItemId,
          quantity,
        },
      ],
    })
  ).data;

  await api("POST", `/api/returns/${ret.id}/receive`);
  await api("POST", `/api/returns/${ret.id}/inspect`, {
    items: [
      {
        rentalOrderItemId: orderItemId,
        goodQuantity: quantity,
        damagedQuantity: 0,
        lostQuantity: 0,
      },
    ],
  });
  const done = (await api("POST", `/api/returns/${ret.id}/complete`)).data;
  return done;
}

async function main() {
  const suffix = stamp();

  log("Scenario 8 – Partial Return", {
    delivered: QTY,
    returnedFirst: QTY_RETURN_1,
    remainingOut: QTY_REMAINING,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Order + deliver 100 chairs");
  const orderNumber = `RO-S8-${suffix}`;
  const created = (
    await api("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 8 – partial return 70 of 100",
      items: [
        { productId: product.id, quantity: QTY, dailyRate: DAILY_RATE },
      ],
    })
  ).data;

  await api("POST", `/api/rental-orders/${created.id}/confirm`);
  const reserved = (
    await api("POST", `/api/rental-orders/${created.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const dispatch = (
    await api("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S8-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S8-001",
      driverName: "Scenario 8 Driver",
      driverPhone: "+92 301 8889999",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 8 full delivery 100",
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity: QTY,
        },
      ],
    })
  ).data;
  await api("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const dispatchDone = (
    await api("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  const dispatchItem = dispatchDone.items?.[0] ?? dispatch.items?.[0];

  const onRent = (await api("GET", `/api/rental-orders/${created.id}`)).data;
  check("Order ON_RENT after full delivery", onRent.status === "ON_RENT", {
    status: onRent.status,
  });

  log("2. Partial return: 70 chairs (30 still out)");
  const return1 = await completeReturn({
    suffix,
    label: "A",
    orderId: created.id,
    dispatchId: dispatch.id,
    orderItemId: orderItem.id,
    dispatchItemId: dispatchItem.id,
    quantity: QTY_RETURN_1,
    date: END_DATE,
  });
  check("First return COMPLETED", return1.status === "COMPLETED", {
    status: return1.status,
    qty: return1.items?.[0]?.quantity,
  });

  const afterPartial = (await api("GET", `/api/rental-orders/${created.id}`)).data;
  check(
    "Order stays open as PARTIALLY_RETURNED (not COMPLETED)",
    afterPartial.status === "PARTIALLY_RETURNED",
    {
      status: afterPartial.status,
      expected: "PARTIALLY_RETURNED",
      remainingOut: QTY_REMAINING,
    },
  );
  check(
    "Order is NOT closed after partial return",
    afterPartial.status !== "COMPLETED",
    { status: afterPartial.status },
  );

  // Invoice should still be blocked while partially returned
  const earlyInvoice = await fetch(`${BASE}/api/rental-invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: BASE,
      Cookie: cookieHeader(),
    },
    body: JSON.stringify({
      invoiceNumber: `INV-S8-EARLY-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Should be blocked",
          quantity: QTY,
          unitPrice: DAILY_RATE,
          sortOrder: 0,
        },
      ],
    }),
  });
  const earlyBody = await earlyInvoice.json().catch(() => ({}));
  check(
    "Invoice still blocked while 30 chairs remain out",
    earlyInvoice.ok === false,
    {
      httpStatus: earlyInvoice.status,
      error: earlyBody.error,
    },
  );

  log("3. Return remaining 30 — order should then close");
  const return2 = await completeReturn({
    suffix,
    label: "B",
    orderId: created.id,
    dispatchId: dispatch.id,
    orderItemId: orderItem.id,
    dispatchItemId: dispatchItem.id,
    quantity: QTY_REMAINING,
    date: END_DATE,
  });
  check("Second return COMPLETED", return2.status === "COMPLETED", {
    status: return2.status,
    qty: return2.items?.[0]?.quantity,
  });

  const afterFull = (await api("GET", `/api/rental-orders/${created.id}`)).data;
  check(
    "Order COMPLETED only after all 100 returned",
    afterFull.status === "COMPLETED",
    { status: afterFull.status },
  );

  const returns = listItems(
    await api("GET", `/api/returns?pageSize=100&rentalOrderId=${created.id}`),
  );
  check("Two return records exist", returns.length === 2, {
    count: returns.length,
    records: returns.map((r) => ({
      number: r.returnNumber,
      status: r.status,
      qty: (r.items ?? []).reduce((s, i) => s + i.quantity, 0),
    })),
  });

  const summary = {
    result: "PASS",
    answer: {
      staysOpenUntilEverythingReturned: true,
      afterPartialReturn: "PARTIALLY_RETURNED (open)",
      afterFullReturn: "COMPLETED (closed)",
    },
    orderNumber,
    rentalOrderId: created.id,
    flow: {
      delivered: QTY,
      returnedFirst: QTY_RETURN_1,
      remainingOut: QTY_REMAINING,
      statusAfterPartial: afterPartial.status,
      statusAfterFull: afterFull.status,
    },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      dispatch: `${BASE}/dispatches/${dispatch.id}`,
      return1: `${BASE}/returns/${return1.id}`,
      return2: `${BASE}/returns/${return2.id}`,
    },
  };

  console.log("\n========== SCENARIO 8 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 8 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
