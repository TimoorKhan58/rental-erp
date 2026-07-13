/**
 * Scenario 4 – Change Quantity Before Delivery
 *
 * Customer orders 100 Chairs, one day later changes to 150 Chairs.
 * Check: invoice updates, inventory updates, total amount updates.
 *
 * Usage: node --env-file=.env scripts/scenario-4-change-quantity.mjs
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

const QTY_INITIAL = 100;
const QTY_UPDATED = 150;
const DAILY_RATE = 50;
const RENTAL_DAYS = 1; // 2026-07-26 → 2026-07-27
const START_DATE = "2026-07-26";
const END_DATE = "2026-07-27";
const EXPECTED_TOTAL_INITIAL = QTY_INITIAL * DAILY_RATE * RENTAL_DAYS; // 5,000
const EXPECTED_TOTAL_UPDATED = QTY_UPDATED * DAILY_RATE * RENTAL_DAYS; // 7,500

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

function orderLineTotal(order) {
  const item = order.items?.[0];
  if (!item) return 0;
  return Number(item.quantity) * Number(item.dailyRate) * RENTAL_DAYS;
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
        customerCode: `CUST-S4-${stamp()}`,
        name: "Scenario 4 Customer",
        phone: "+92 300 4445566",
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
        warehouseCode: `WH-S4-${stamp()}`,
        name: "Scenario 4 Warehouse",
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
        maximumStock: Math.max(minAvailable * 2, 500),
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
  const findings = {
    quantityChangeAllowedInDraft: null,
    quantityChangeAllowedAfterConfirm: null,
    totalAmountUpdated: null,
    inventoryUpdatedOnQtyChange: null,
    inventoryUpdatedOnReserve: null,
    invoiceReflectsUpdatedQty: null,
  };

  log("Scenario 4 – Change Quantity Before Delivery", {
    from: QTY_INITIAL,
    to: QTY_UPDATED,
    expectedTotals: {
      initial: EXPECTED_TOTAL_INITIAL,
      updated: EXPECTED_TOTAL_UPDATED,
    },
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  const invBeforeOrder = await getInventory(product.id, warehouse.id);
  const reservedBeforeOrder = invBeforeOrder?.reservedQuantity ?? 0;

  log("1. Create order for 100 Chairs (DRAFT)");
  const orderNumber = `RO-S4-${suffix}`;
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 4 – initial 100 chairs",
      items: [
        {
          productId: product.id,
          quantity: QTY_INITIAL,
          dailyRate: DAILY_RATE,
        },
      ],
    })
  ).data;

  check("Order created with qty 100", created.items?.[0]?.quantity === QTY_INITIAL, {
    quantity: created.items?.[0]?.quantity,
    status: created.status,
  });
  check(
    "Initial computed total = 5,000",
    orderLineTotal(created) === EXPECTED_TOTAL_INITIAL,
    { total: orderLineTotal(created) },
  );

  const invAfterCreate = await getInventory(product.id, warehouse.id);
  check(
    "Inventory reserved unchanged on DRAFT create",
    (invAfterCreate?.reservedQuantity ?? 0) === reservedBeforeOrder,
    {
      before: reservedBeforeOrder,
      after: invAfterCreate?.reservedQuantity,
    },
  );

  log("2. One day later: change quantity 100 → 150 (while DRAFT)");
  const updated = (
    await apiOrThrow("PATCH", `/api/rental-orders/${created.id}`, {
      remarks: "Scenario 4 – changed to 150 chairs before delivery",
      items: [
        {
          productId: product.id,
          quantity: QTY_UPDATED,
          dailyRate: DAILY_RATE,
        },
      ],
    })
  ).data;
  findings.quantityChangeAllowedInDraft = true;

  check("Quantity updated to 150", updated.items?.[0]?.quantity === QTY_UPDATED, {
    quantity: updated.items?.[0]?.quantity,
  });
  check(
    "Total amount updates to 7,500",
    orderLineTotal(updated) === EXPECTED_TOTAL_UPDATED,
    {
      total: orderLineTotal(updated),
      expected: EXPECTED_TOTAL_UPDATED,
      formula: `${QTY_UPDATED} × ${DAILY_RATE} × ${RENTAL_DAYS}`,
    },
  );
  findings.totalAmountUpdated = orderLineTotal(updated) === EXPECTED_TOTAL_UPDATED;

  const invAfterQtyChange = await getInventory(product.id, warehouse.id);
  const reservedAfterQtyChange = invAfterQtyChange?.reservedQuantity ?? 0;
  check(
    "Inventory reserved NOT changed by qty edit alone (still DRAFT)",
    reservedAfterQtyChange === reservedBeforeOrder,
    {
      reserved: reservedAfterQtyChange,
      note: "Reservation happens only on /reserve",
    },
  );
  findings.inventoryUpdatedOnQtyChange = false; // by design

  log("3. Confirm + reserve 150 (inventory should update here)");
  await apiOrThrow("POST", `/api/rental-orders/${created.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${created.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY_UPDATED }],
    })
  ).data;

  check("Order reserved qty = 150", reserved.items?.[0]?.reservedQuantity === QTY_UPDATED, {
    reservedQuantity: reserved.items?.[0]?.reservedQuantity,
    orderQuantity: reserved.items?.[0]?.quantity,
  });

  const invAfterReserve = await getInventory(product.id, warehouse.id);
  const reservedDelta =
    (invAfterReserve?.reservedQuantity ?? 0) - reservedBeforeOrder;
  check(
    "Inventory reserved increased by 150 after reserve",
    reservedDelta === QTY_UPDATED,
    {
      before: reservedBeforeOrder,
      after: invAfterReserve?.reservedQuantity,
      delta: reservedDelta,
      available:
        invAfterReserve?.availableQuantity ??
        (invAfterReserve?.quantityOnHand ?? 0) -
          (invAfterReserve?.reservedQuantity ?? 0),
    },
  );
  findings.inventoryUpdatedOnReserve = reservedDelta === QTY_UPDATED;

  log("4. Attempt qty change AFTER confirm (should be blocked)");
  // Use a separate draft-only path already done; probe confirm restriction on this reserved order
  const blocked = await api("PATCH", `/api/rental-orders/${created.id}`, {
    items: [
      {
        productId: product.id,
        quantity: 160,
        dailyRate: DAILY_RATE,
      },
    ],
  });
  findings.quantityChangeAllowedAfterConfirm = blocked.ok;
  check(
    "Quantity change blocked after confirm/reserve",
    blocked.ok === false && blocked.status === 422,
    {
      httpStatus: blocked.status,
      error: blocked.json?.error,
    },
  );

  log("5. Deliver + return + invoice (invoice should reflect 150 / 7,500)");
  const orderItem = reserved.items?.[0];
  const dispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S4-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S4-001",
      driverName: "Scenario 4 Driver",
      driverPhone: "+92 301 4445555",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 4 delivery of 150 chairs",
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity: QTY_UPDATED,
        },
      ],
    })
  ).data;
  await apiOrThrow("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const dispatchDone = (
    await apiOrThrow("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  const dispatchItem = dispatchDone.items?.[0] ?? dispatch.items?.[0];

  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S4-${suffix}`,
      rentalOrderId: created.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Scenario 4 return",
      items: [
        {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchItem?.id ?? null,
          quantity: QTY_UPDATED,
        },
      ],
    })
  ).data;
  await apiOrThrow("POST", `/api/returns/${ret.id}/receive`);
  await apiOrThrow("POST", `/api/returns/${ret.id}/inspect`, {
    items: [
      {
        rentalOrderItemId: orderItem.id,
        goodQuantity: QTY_UPDATED,
        damagedQuantity: 0,
        lostQuantity: 0,
      },
    ],
  });
  await apiOrThrow("POST", `/api/returns/${ret.id}/complete`);

  const completed = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check("Order COMPLETED", completed.status === "COMPLETED", {
    status: completed.status,
    quantity: completed.items?.[0]?.quantity,
  });

  // No invoice existed before delivery — create invoice from updated qty/total
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S4-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-08-03",
      notes: "Scenario 4 invoice after qty change 100→150",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Chair rental × ${QTY_UPDATED} (${RENTAL_DAYS} day)`,
          quantity: QTY_UPDATED,
          unitPrice: DAILY_RATE * RENTAL_DAYS,
          sortOrder: 0,
        },
      ],
    })
  ).data;

  check(
    "Invoice quantity reflects 150 (not 100)",
    invoice.items?.[0]?.quantity === QTY_UPDATED,
    { quantity: invoice.items?.[0]?.quantity },
  );
  check(
    "Invoice total reflects updated amount 7,500",
    Number(invoice.grandTotal) === EXPECTED_TOTAL_UPDATED,
    {
      grandTotal: invoice.grandTotal,
      expected: EXPECTED_TOTAL_UPDATED,
    },
  );
  findings.invoiceReflectsUpdatedQty =
    invoice.items?.[0]?.quantity === QTY_UPDATED &&
    Number(invoice.grandTotal) === EXPECTED_TOTAL_UPDATED;

  const issued = (
    await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`)
  ).data;

  const summary = {
    result: "PASS",
    answers: {
      invoiceUpdates:
        "No invoice exists before delivery. After return, invoice created with qty 150 / total 7,500 (updated values).",
      inventoryUpdates:
        "Qty edit in DRAFT does not touch inventory. After reserve of 150, reservedQuantity increases by 150.",
      totalAmountUpdates:
        "Yes — order line total 5,000 → 7,500 when qty changes in DRAFT. Invoice grandTotal = 7,500.",
    },
    findings,
    orderNumber,
    rentalOrderId: created.id,
    invoiceId: issued.id,
    totals: {
      initial: EXPECTED_TOTAL_INITIAL,
      afterQtyChange: orderLineTotal(updated),
      invoiceGrandTotal: issued.grandTotal,
    },
    inventory: {
      reservedBefore: reservedBeforeOrder,
      reservedAfterQtyEdit: reservedAfterQtyChange,
      reservedAfterReserve: invAfterReserve?.reservedQuantity,
      deltaOnReserve: reservedDelta,
    },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
    },
  };

  console.log("\n========== SCENARIO 4 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 4 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
