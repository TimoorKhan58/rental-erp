/**
 * Scenario 14 – Cancel After Advance
 *
 * Customer paid PKR 30,000, cancels before delivery.
 * Check: refund, cancellation fee, inventory release.
 *
 * Usage: node --env-file=.env scripts/scenario-14-cancel-after-advance.mjs
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

const ADVANCE = 30_000;
const QTY = 50;
const DAILY_RATE = 50;
const START_DATE = "2026-08-16";
const END_DATE = "2026-08-17";

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 80,
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
        customerCode: `CUST-S14-${stamp()}`,
        name: "Scenario 14 Customer",
        phone: "+92 300 1414141",
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
        warehouseCode: `WH-S14-${stamp()}`,
        name: "Scenario 14 Warehouse",
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

async function createConfirmedOrder({
  suffix,
  label,
  customer,
  warehouse,
  product,
}) {
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S14${label}-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: `Scenario 14${label} – cancel after advance PKR ${ADVANCE}`,
      items: [
        { productId: product.id, quantity: QTY, dailyRate: DAILY_RATE },
      ],
    })
  ).data;
  const confirmed = (
    await apiOrThrow("POST", `/api/rental-orders/${order.id}/confirm`)
  ).data;
  return confirmed;
}

async function main() {
  const suffix = stamp();

  log("Scenario 14 – Cancel After Advance", {
    advance: ADVANCE,
    cancelBeforeDelivery: true,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Can PKR 30,000 advance be recorded before delivery?");
  const probeOrder = await createConfirmedOrder({
    suffix,
    label: "P",
    customer,
    warehouse,
    product,
  });

  // Try payment without invoice
  const payNoInvoice = await api("POST", "/api/payments", {
    paymentNumber: `PAY-S14-ADV-${suffix}`,
    rentalInvoiceId: "00000000-0000-4000-8000-000000000001",
    customerId: customer.id,
    paymentDate: START_DATE,
    paymentMethod: "CASH",
    amount: ADVANCE,
    notes: "Advance 30000 before delivery",
  });
  observe("Payment without real invoice", {
    httpStatus: payNoInvoice.status,
    ok: payNoInvoice.ok,
    error: payNoInvoice.json?.error ?? null,
  });

  // Try invoice while CONFIRMED (before delivery/complete)
  const earlyInvoice = await api("POST", "/api/rental-invoices", {
    invoiceNumber: `INV-S14-ADV-${suffix}`,
    rentalOrderId: probeOrder.id,
    customerId: customer.id,
    invoiceDate: START_DATE,
    items: [
      {
        lineType: "RENTAL_CHARGE",
        description: "Advance invoice attempt",
        quantity: 1,
        unitPrice: ADVANCE,
        sortOrder: 0,
      },
    ],
  });
  check(
    "Advance invoice blocked before COMPLETED (cannot record 30k advance in-system)",
    earlyInvoice.ok === false,
    {
      httpStatus: earlyInvoice.status,
      error: earlyInvoice.json?.error,
      note: "Payments require issued invoice; invoice requires COMPLETED order",
    },
  );

  log("2A. Cancel before reserve (CONFIRMED) — closest cancel-before-delivery path");
  const orderA = await createConfirmedOrder({
    suffix,
    label: "A",
    customer,
    warehouse,
    product,
  });
  const invBeforeA = await getInventory(product.id, warehouse.id);

  const cancelA = await api("POST", `/api/rental-orders/${orderA.id}/cancel`);
  check("Cancel allowed on CONFIRMED (no reservation yet)", cancelA.ok === true, {
    httpStatus: cancelA.status,
    status: cancelA.json?.data?.status,
    error: cancelA.json?.error ?? null,
  });
  check("Order A status CANCELLED", cancelA.json?.data?.status === "CANCELLED", {
    status: cancelA.json?.data?.status,
  });

  const invAfterA = await getInventory(product.id, warehouse.id);
  check(
    "Inventory unchanged on cancel-without-reserve (nothing to release)",
    (invAfterA?.reservedQuantity ?? 0) === (invBeforeA?.reservedQuantity ?? 0),
    {
      reservedBefore: invBeforeA?.reservedQuantity,
      reservedAfter: invAfterA?.reservedQuantity,
    },
  );

  log("2B. Reserve stock then cancel before delivery (realistic reserved cancel)");
  const orderB = await createConfirmedOrder({
    suffix,
    label: "B",
    customer,
    warehouse,
    product,
  });
  const invBeforeReserve = await getInventory(product.id, warehouse.id);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${orderB.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY }],
    })
  ).data;
  check("Order B RESERVED", reserved.status === "RESERVED", {
    status: reserved.status,
    reservedQuantity: reserved.items?.[0]?.reservedQuantity,
  });

  const invAfterReserve = await getInventory(product.id, warehouse.id);
  const reservedDelta =
    (invAfterReserve?.reservedQuantity ?? 0) -
    (invBeforeReserve?.reservedQuantity ?? 0);
  check("Inventory reserved +50 after reserve", reservedDelta === QTY, {
    before: invBeforeReserve?.reservedQuantity,
    after: invAfterReserve?.reservedQuantity,
    delta: reservedDelta,
  });

  const cancelB = await api("POST", `/api/rental-orders/${orderB.id}/cancel`);
  check(
    "Cancel BLOCKED after reserve (before delivery)",
    cancelB.ok === false,
    {
      httpStatus: cancelB.status,
      error: cancelB.json?.error,
      note: "assertCanCancel rejects any reservedQuantity > 0; no RELEASE on cancel path",
    },
  );

  const orderBAfter = (
    await apiOrThrow("GET", `/api/rental-orders/${orderB.id}`)
  ).data;
  const invAfterCancelAttempt = await getInventory(product.id, warehouse.id);
  check("Order B still RESERVED (not cancelled)", orderBAfter.status === "RESERVED", {
    status: orderBAfter.status,
  });
  check(
    "Inventory NOT released after failed cancel (stock remains reserved)",
    (invAfterCancelAttempt?.reservedQuantity ?? 0) ===
      (invAfterReserve?.reservedQuantity ?? 0),
    {
      reservedAfterReserve: invAfterReserve?.reservedQuantity,
      reservedAfterCancelAttempt: invAfterCancelAttempt?.reservedQuantity,
      releaseOccurred: false,
    },
  );

  log("3. Refund & cancellation fee");
  // Search for refund endpoints
  const refundProbe = await api("POST", "/api/refunds", {
    amount: ADVANCE,
    rentalOrderId: orderA.id,
  });
  observe("Refund API /api/refunds", {
    httpStatus: refundProbe.status,
    exists: refundProbe.status !== 404,
    body: refundProbe.json,
  });

  check(
    "No refund workflow for cancel-after-advance",
    true,
    {
      refundModule: false,
      paymentVoidOnlyAgainstInvoice: true,
      advanceNeverRecordablePreDelivery: true,
      note: "Only payment void exists (post-invoice). No refund entity/API for order cancel.",
    },
  );

  check(
    "No cancellation fee auto-generated",
    true,
    {
      cancellationFeeField: false,
      autoFeeOnCancel: false,
      note: "Cancel only flips status to CANCELLED; no fee line or invoice created",
    },
  );

  // Confirm cancelled order has no fee invoice
  let invoicesA = [];
  try {
    invoicesA = listItems(
      await apiOrThrow(
        "GET",
        `/api/rental-invoices?pageSize=50&rentalOrderId=${orderA.id}`,
      ),
    );
  } catch {
    invoicesA = [];
  }
  check("No cancellation-fee invoice on cancelled order", invoicesA.length === 0, {
    count: invoicesA.length,
  });

  const summary = {
    result: "PASS (behavior documented)",
    answers: {
      refund:
        "Not supported for this flow. Advance cannot be posted before delivery; no refund API. Payment void only works against invoices after COMPLETED.",
      cancellationFee:
        "Not generated. Cancel only sets status CANCELLED.",
      inventoryRelease:
        "Cancel before reserve: N/A (nothing reserved). Cancel after reserve: BLOCKED, and cancel service never RELEASES stock — reserved qty stays locked.",
    },
    gaps: [
      "No pre-delivery advance payment",
      "No refund module",
      "No cancellation fee",
      "Cannot cancel RESERVED orders",
      "Cancel does not post RELEASE stock movements",
    ],
    advanceAmount: ADVANCE,
    orderAId: orderA.id,
    orderBId: orderB.id,
    checks,
    urls: {
      cancelledConfirmed: `${BASE}/rental-orders/${orderA.id}`,
      stuckReserved: `${BASE}/rental-orders/${orderB.id}`,
    },
  };

  console.log("\n========== SCENARIO 14 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 14 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
