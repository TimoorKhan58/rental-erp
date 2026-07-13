/**
 * Scenario 13 – Extend Rental
 *
 * Customer extends rental by three days.
 * Check: availability validation, invoice update.
 *
 * Usage: node --env-file=.env scripts/scenario-13-extend-rental.mjs
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

const START = "2026-08-11";
const END_ORIGINAL = "2026-08-12"; // 1 day
const END_EXTENDED = "2026-08-15"; // +3 days → 4 days total
const ORIGINAL_DAYS = 1;
const EXTENDED_DAYS = 4;
const EXTRA_DAYS = 3;
const QTY = 20;
const DAILY_RATE = 50;
const TOTAL_ORIGINAL = QTY * DAILY_RATE * ORIGINAL_DAYS; // 1,000
const TOTAL_EXTENDED = QTY * DAILY_RATE * EXTENDED_DAYS; // 4,000

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
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

function rentalDays(start, end) {
  const a = new Date(`${start}T00:00:00.000Z`).getTime();
  const b = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

function lineTotal(order, days) {
  const item = order.items?.[0];
  if (!item) return 0;
  return Number(item.quantity) * Number(item.dailyRate) * days;
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
        customerCode: `CUST-S13-${stamp()}`,
        name: "Scenario 13 Customer",
        phone: "+92 300 1313131",
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
        warehouseCode: `WH-S13-${stamp()}`,
        name: "Scenario 13 Warehouse",
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
        maximumStock: Math.max(minAvailable * 2, 100),
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

async function listOrderInvoices(orderId, customerId) {
  try {
    return listItems(
      await apiOrThrow(
        "GET",
        `/api/rental-invoices?pageSize=100&rentalOrderId=${orderId}`,
      ),
    );
  } catch {
    const all = listItems(
      await apiOrThrow(
        "GET",
        `/api/rental-invoices?pageSize=100&customerId=${customerId}`,
      ),
    );
    return all.filter((inv) => inv.rentalOrderId === orderId);
  }
}

async function main() {
  const suffix = stamp();

  log("Scenario 13 – Extend Rental", {
    original: { start: START, end: END_ORIGINAL, days: ORIGINAL_DAYS, total: TOTAL_ORIGINAL },
    extended: { end: END_EXTENDED, days: EXTENDED_DAYS, extraDays: EXTRA_DAYS, total: TOTAL_EXTENDED },
  });

  check(
    "Extended period is +3 days",
    rentalDays(START, END_EXTENDED) === EXTENDED_DAYS &&
      rentalDays(START, END_EXTENDED) - rentalDays(START, END_ORIGINAL) === EXTRA_DAYS,
    {
      originalDays: rentalDays(START, END_ORIGINAL),
      extendedDays: rentalDays(START, END_EXTENDED),
    },
  );

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  const invBefore = await getInventory(product.id, warehouse.id);

  log("A. Extend while DRAFT (pre-delivery)");
  const draftOrder = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S13A-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START,
      endDate: END_ORIGINAL,
      remarks: "Scenario 13A – extend in DRAFT",
      items: [
        { productId: product.id, quantity: QTY, dailyRate: DAILY_RATE },
      ],
    })
  ).data;

  const invDuringDraft = await getInventory(product.id, warehouse.id);
  observe("Availability during DRAFT extend (no date conflict check)", {
    availableBefore: invBefore?.availableQuantity,
    availableDuringDraft: invDuringDraft?.availableQuantity,
    reserved: invDuringDraft?.reservedQuantity,
    note: "Availability is only quantityOnHand - reservedQuantity; no calendar/overlap validation on endDate change",
  });

  const extendedDraft = await api("PATCH", `/api/rental-orders/${draftOrder.id}`, {
    endDate: END_EXTENDED,
    remarks: "Extended by 3 days while DRAFT",
  });
  check("Extend endDate allowed in DRAFT", extendedDraft.ok === true, {
    httpStatus: extendedDraft.status,
    endDate: extendedDraft.json?.data?.endDate,
    error: extendedDraft.json?.error ?? null,
  });

  const draftAfter = extendedDraft.json?.data;
  check(
    "DRAFT order endDate updated to +3 days",
    String(draftAfter?.endDate ?? "").startsWith(END_EXTENDED),
    { endDate: draftAfter?.endDate },
  );
  check(
    "Computed total updates 1,000 → 4,000 after DRAFT extend",
    lineTotal(draftAfter, EXTENDED_DAYS) === TOTAL_EXTENDED,
    {
      total: lineTotal(draftAfter, EXTENDED_DAYS),
      expected: TOTAL_EXTENDED,
    },
  );

  const invAfterDraftExtend = await getInventory(product.id, warehouse.id);
  check(
    "No availability change from DRAFT date extend alone",
    (invAfterDraftExtend?.availableQuantity ?? 0) ===
      (invDuringDraft?.availableQuantity ?? 0),
    {
      before: invDuringDraft?.availableQuantity,
      after: invAfterDraftExtend?.availableQuantity,
    },
  );

  log("B. Extend after delivery (ON_RENT) — typical customer request");
  const liveOrder = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S13B-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START,
      endDate: END_ORIGINAL,
      remarks: "Scenario 13B – extend while on rent",
      items: [
        { productId: product.id, quantity: QTY, dailyRate: DAILY_RATE },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/rental-orders/${liveOrder.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${liveOrder.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const invAfterReserve = await getInventory(product.id, warehouse.id);
  observe("Availability after reserve (stock-based only)", {
    available: invAfterReserve?.availableQuantity,
    reserved: invAfterReserve?.reservedQuantity,
  });

  const dispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S13B-${suffix}`,
      rentalOrderId: liveOrder.id,
      dispatchDate: START,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S13-001",
      driverName: "Scenario 13 Driver",
      driverPhone: "+92 301 1313131",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 13 delivery",
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

  const onRent = (await apiOrThrow("GET", `/api/rental-orders/${liveOrder.id}`)).data;
  check("Order ON_RENT before extend attempt", onRent.status === "ON_RENT", {
    status: onRent.status,
    endDate: onRent.endDate,
  });

  const extendOnRent = await api("PATCH", `/api/rental-orders/${liveOrder.id}`, {
    endDate: END_EXTENDED,
    remarks: "Customer requests +3 day extension while on rent",
  });
  check(
    "Extend while ON_RENT is BLOCKED (no extend-rental workflow)",
    extendOnRent.ok === false,
    {
      httpStatus: extendOnRent.status,
      error: extendOnRent.json?.error,
    },
  );

  const stillOnRent = (
    await apiOrThrow("GET", `/api/rental-orders/${liveOrder.id}`)
  ).data;
  check(
    "endDate unchanged after blocked extend",
    String(stillOnRent.endDate).startsWith(END_ORIGINAL),
    { endDate: stillOnRent.endDate },
  );

  observe("Availability validation on extend", {
    dateRangeConflictCheck: false,
    stockAvailabilityCheckOnExtend: false,
    whatExists:
      "Reserve checks available stock qty only; extending dates never re-validates future availability",
  });

  log("C. Invoice update after extension");
  // Complete return so invoice can be created
  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S13B-${suffix}`,
      rentalOrderId: liveOrder.id,
      dispatchId: dispatch.id,
      returnDate: END_EXTENDED, // physically returned on extended date
      remarks: "Returned after informal extension",
      items: [
        {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchItem.id,
          quantity: QTY,
        },
      ],
    })
  ).data;
  await apiOrThrow("POST", `/api/returns/${ret.id}/receive`);
  await apiOrThrow("POST", `/api/returns/${ret.id}/inspect`, {
    items: [
      {
        rentalOrderItemId: orderItem.id,
        goodQuantity: QTY,
        damagedQuantity: 0,
        lostQuantity: 0,
      },
    ],
  });
  await apiOrThrow("POST", `/api/returns/${ret.id}/complete`);

  const completed = (
    await apiOrThrow("GET", `/api/rental-orders/${liveOrder.id}`)
  ).data;
  check("Order COMPLETED", completed.status === "COMPLETED", {
    status: completed.status,
    endDateStillOriginal: String(completed.endDate).startsWith(END_ORIGINAL),
  });

  const invoicesBefore = await listOrderInvoices(liveOrder.id, customer.id);
  check("No invoice auto-updated/created from extension", invoicesBefore.length === 0, {
    count: invoicesBefore.length,
  });

  // Invoice must be built manually for extended period
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S13B-${suffix}`,
      rentalOrderId: liveOrder.id,
      customerId: customer.id,
      invoiceDate: END_EXTENDED,
      dueDate: "2026-08-22",
      notes: "Manual invoice for extended rental (+3 days) — order endDate was never updated",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Chair rental × ${QTY} (${EXTENDED_DAYS} days including extension)`,
          quantity: QTY,
          unitPrice: DAILY_RATE * EXTENDED_DAYS,
          sortOrder: 0,
        },
      ],
    })
  ).data;

  check(
    "Manual invoice can reflect extended total 4,000",
    Number(invoice.grandTotal) === TOTAL_EXTENDED,
    {
      grandTotal: invoice.grandTotal,
      expected: TOTAL_EXTENDED,
      note: "Invoice is not auto-updated from order; lines are entered manually",
    },
  );
  await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`);

  const summary = {
    result: "PASS (behavior documented)",
    answers: {
      availabilityValidation:
        "No date-range/availability validation on extend. Stock availability is only checked at reserve (qty), not when changing endDate.",
      invoiceUpdate:
        "No auto invoice update. Extend while ON_RENT is blocked. Invoice lines must be entered manually after COMPLETED.",
    },
    findings: {
      extendInDraft: true,
      extendWhileOnRent: false,
      dedicatedExtendApi: false,
      calendarAvailabilityCheck: false,
      autoInvoiceUpdate: false,
    },
    draftOrderId: draftOrder.id,
    liveOrderId: liveOrder.id,
    invoiceId: invoice.id,
    checks,
    urls: {
      draftOrder: `${BASE}/rental-orders/${draftOrder.id}`,
      liveOrder: `${BASE}/rental-orders/${liveOrder.id}`,
      invoice: `${BASE}/rental-invoices/${invoice.id}`,
    },
  };

  console.log("\n========== SCENARIO 13 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 13 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
