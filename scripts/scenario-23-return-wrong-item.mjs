/**
 * Scenario 23 – Return Wrong Item
 *
 * Customer rented: White Plastic Chairs
 * Returns: Banquet Chairs
 * Check: system detects the mismatch
 *
 * Usage: node --env-file=.env scripts/scenario-23-return-wrong-item.mjs
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

const QTY = 20;
const DAILY_RATE = 50;
const START_DATE = "2026-09-03";
const END_DATE = "2026-09-04";

const WHITE = {
  productCode: "CHAIR-WHITE-S23",
  name: "White Plastic Chairs",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 50,
};

const BANQUET = {
  productCode: "CHAIR-BANQUET-S23",
  name: "Banquet Chairs",
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
        customerCode: `CUST-S23-${stamp()}`,
        name: "Scenario 23 Customer",
        phone: "+92 300 2323232",
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
        warehouseCode: `WH-S23-${stamp()}`,
        name: "Scenario 23 Warehouse",
        isActive: true,
      })
    ).data;
  }
  return warehouse;
}

async function ensureProduct(def) {
  const products = listItems(
    await apiOrThrow(
      "GET",
      `/api/products?pageSize=100&search=${encodeURIComponent(def.productCode)}`,
    ),
  );
  let product = products.find((p) => p.productCode === def.productCode) ?? null;
  if (!product) {
    product = (
      await apiOrThrow("POST", "/api/products", {
        productCode: def.productCode,
        name: def.name,
        unit: def.unit,
        rentalRate: def.rentalRate,
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

async function deliverProduct({
  suffix,
  label,
  customer,
  warehouse,
  product,
  quantity,
}) {
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S23${label}-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: `Scenario 23 – ${product.name}`,
      items: [
        { productId: product.id, quantity, dailyRate: DAILY_RATE },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/rental-orders/${order.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: [{ productId: product.id, quantity }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const dispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S23${label}-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: `LES-S23-${label}`,
      driverName: "Scenario 23 Driver",
      driverPhone: "+92 301 2323232",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: `Deliver ${product.name}`,
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity,
        },
      ],
    })
  ).data;
  await apiOrThrow("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const done = (
    await apiOrThrow("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  const dispatchItem = done.items?.[0] ?? dispatch.items?.[0];

  return { order, orderItem, dispatch: done, dispatchItem, product };
}

async function main() {
  const suffix = stamp();

  log("Scenario 23 – Return Wrong Item", {
    rented: WHITE.name,
    attemptedReturn: BANQUET.name,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const whiteProduct = await ensureProduct(WHITE);
  const banquetProduct = await ensureProduct(BANQUET);
  await ensureStock(whiteProduct.id, warehouse.id, WHITE.stock);
  await ensureStock(banquetProduct.id, warehouse.id, BANQUET.stock);

  check("Products are distinct", whiteProduct.id !== banquetProduct.id, {
    white: { id: whiteProduct.id, name: whiteProduct.name },
    banquet: { id: banquetProduct.id, name: banquetProduct.name },
  });

  log("1. Rent & deliver White Plastic Chairs");
  const white = await deliverProduct({
    suffix,
    label: "W",
    customer,
    warehouse,
    product: whiteProduct,
    quantity: QTY,
  });
  check("White Plastic Chairs delivered", white.dispatch.status === "COMPLETED", {
    product: whiteProduct.name,
    qty: white.dispatchItem?.quantity,
  });

  log("2. Also deliver Banquet Chairs on a separate order (source of wrong item IDs)");
  const banquet = await deliverProduct({
    suffix,
    label: "B",
    customer,
    warehouse,
    product: banquetProduct,
    quantity: QTY,
  });
  check("Banquet Chairs delivered (separate order)", banquet.dispatch.status === "COMPLETED", {
    product: banquetProduct.name,
    orderId: banquet.order.id,
  });

  observe("Return API has no productId field — items use rentalOrderItemId only", {
    createReturnItemFields: [
      "rentalOrderItemId",
      "dispatchItemId",
      "quantity",
      "notes",
    ],
  });

  log("3. Wrong item — return Banquet line against White Plastic dispatch");
  const wrongReturn = await api("POST", "/api/returns", {
    returnNumber: `RET-S23-WRONG-${suffix}`,
    rentalOrderId: white.order.id,
    dispatchId: white.dispatch.id,
    returnDate: END_DATE,
    remarks: "Attempt to return Banquet Chairs against White Plastic rental",
    items: [
      {
        rentalOrderItemId: banquet.orderItem.id,
        dispatchItemId: banquet.dispatchItem.id,
        quantity: QTY,
        notes: "Banquet Chairs (wrong product)",
      },
    ],
  });

  check("System REJECTS Banquet return on White Plastic dispatch", wrongReturn.ok === false, {
    httpStatus: wrongReturn.status,
    error: wrongReturn.json?.error,
  });

  const msg = String(wrongReturn.json?.error?.message ?? "");
  check(
    "Error indicates item does not belong to this dispatch/order",
    msg.toLowerCase().includes("belong") ||
      msg.toLowerCase().includes("dispatch") ||
      msg.toLowerCase().includes("mismatch") ||
      msg.toLowerCase().includes("invalid"),
    { message: msg },
  );

  log("4. Control — correct White Plastic Chairs return should succeed");
  const okReturn = await api("POST", "/api/returns", {
    returnNumber: `RET-S23-OK-${suffix}`,
    rentalOrderId: white.order.id,
    dispatchId: white.dispatch.id,
    returnDate: END_DATE,
    remarks: "Correct product return",
    items: [
      {
        rentalOrderItemId: white.orderItem.id,
        dispatchItemId: white.dispatchItem.id,
        quantity: QTY,
      },
    ],
  });
  check("Correct White Plastic return ACCEPTED", okReturn.ok === true, {
    httpStatus: okReturn.status,
    status: okReturn.json?.data?.status,
    error: okReturn.json?.error ?? null,
  });

  // Cancel the control return so remaining qty is free for the mixed-ID probe
  if (okReturn.ok && okReturn.json?.data?.id) {
    await api("POST", `/api/returns/${okReturn.json.data.id}/cancel`);
  }

  log("5. Cross-mix — White order item id but Banquet dispatchItemId");
  const mixedIds = await api("POST", "/api/returns", {
    returnNumber: `RET-S23-MIX-${suffix}`,
    rentalOrderId: white.order.id,
    dispatchId: white.dispatch.id,
    returnDate: END_DATE,
    remarks: "Mixed IDs: white line + banquet dispatch item",
    items: [
      {
        rentalOrderItemId: white.orderItem.id,
        dispatchItemId: banquet.dispatchItem.id,
        quantity: QTY,
      },
    ],
  });
  observe("Mixed ID return attempt (white line + banquet dispatchItemId)", {
    blocked: mixedIds.ok === false,
    httpStatus: mixedIds.status,
    error: mixedIds.json?.error ?? null,
    accepted: mixedIds.ok
      ? {
          returnId: mixedIds.json?.data?.id,
          gap: "dispatchItemId is not validated against the rental order line / product",
        }
      : null,
  });

  const mismatchDetected = wrongReturn.ok === false;

  const summary = {
    result: mismatchDetected ? "PASS" : "FAIL",
    answer: {
      mismatchDetected,
      how: "Return items must belong to the selected dispatch (rentalOrderItemId must match a dispatched line). Wrong product line IDs are rejected.",
      productScanOrBarcodeCheck: false,
      physicalWrongItemIfCorrectLineSelected:
        "Not detectable — staff selecting the correct order line while physically receiving Banquet Chairs would still succeed.",
      error: wrongReturn.json?.error?.message ?? null,
      mixedDispatchItemIdBlocked: mixedIds.ok === false,
      gap:
        mixedIds.ok === true
          ? "Optional dispatchItemId from another product/dispatch is accepted if rentalOrderItemId belongs to the dispatch."
          : null,
    },
    rented: { product: WHITE.name, orderId: white.order.id },
    wrongAttempt: { product: BANQUET.name, rejected: mismatchDetected },
    checks,
    urls: {
      whiteOrder: `${BASE}/rental-orders/${white.order.id}`,
      banquetOrder: `${BASE}/rental-orders/${banquet.order.id}`,
      whiteDispatch: `${BASE}/dispatches/${white.dispatch.id}`,
    },
  };

  console.log("\n========== SCENARIO 23 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));

  if (summary.result !== "PASS") process.exit(1);
}

main().catch((error) => {
  console.error("\nSCENARIO 23 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
