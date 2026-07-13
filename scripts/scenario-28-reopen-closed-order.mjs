/**
 * Scenario 28 – Reopen Closed Order
 *
 * Order is closed (COMPLETED).
 * Attempt to: add items, edit quantities, add payments.
 * Check: whether reopening is allowed and audited.
 *
 * Usage: node --env-file=.env scripts/scenario-28-reopen-closed-order.mjs
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

const QTY = 10;
const QTY_EDIT = 15;
const DAILY_RATE = 50;
const INVOICE_TOTAL = 25_000;
const PAYMENT_AMOUNT = 5_000;
const START_DATE = "2026-09-11";
const END_DATE = "2026-09-12";

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 50,
};

const EXTRA_PRODUCT = {
  productCode: "TABLE-S1",
  name: "Table",
  unit: "pcs",
  rentalRate: 200,
  stock: 20,
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
    json = { raw: text.slice(0, 200) };
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
        customerCode: `CUST-S28-${stamp()}`,
        name: "Scenario 28 Customer",
        phone: "+92 300 2828282",
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
        warehouseCode: `WH-S28-${stamp()}`,
        name: "Scenario 28 Warehouse",
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
  let product =
    products.find((p) => p.productCode === def.productCode) ??
    products.find((p) => p.name?.toLowerCase() === def.name.toLowerCase());
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

async function closeOrder({ customer, warehouse, product, suffix }) {
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S28-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 28 – closed order reopen attempts",
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
      dispatchNumber: `DSP-S28-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S28-001",
      driverName: "Scenario 28 Driver",
      driverPhone: "+92 301 2828282",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 28 delivery",
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

  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S28-${suffix}`,
      rentalOrderId: order.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Scenario 28 full return",
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

  const closed = (await apiOrThrow("GET", `/api/rental-orders/${order.id}`)).data;
  return { order: closed, orderItem, product };
}

async function main() {
  const suffix = stamp();

  log("Scenario 28 – Reopen Closed Order", {
    attempts: ["add items", "edit quantities", "add payments", "reopen"],
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const chair = await ensureProduct(PRODUCT);
  const table = await ensureProduct(EXTRA_PRODUCT);
  await ensureStock(chair.id, warehouse.id, PRODUCT.stock);
  await ensureStock(table.id, warehouse.id, EXTRA_PRODUCT.stock);

  log("1. Close order (COMPLETED via full return)");
  const { order, orderItem } = await closeOrder({
    customer,
    warehouse,
    product: chair,
    suffix,
  });
  check("Order is COMPLETED (closed)", order.status === "COMPLETED", {
    status: order.status,
    id: order.id,
  });

  log("2. Probe reopen endpoint");
  const reopen = await api("POST", `/api/rental-orders/${order.id}/reopen`);
  observe("POST /reopen", {
    exists: reopen.status !== 404,
    httpStatus: reopen.status,
    errorCode: reopen.json?.error?.code ?? null,
    errorMessage: reopen.json?.error?.message ?? null,
  });
  check("No reopen endpoint (or reopen not available)", reopen.ok === false, {
    httpStatus: reopen.status,
  });

  log("3. Attempt add items on closed order");
  const addItems = await api("PATCH", `/api/rental-orders/${order.id}`, {
    remarks: "Try add table after close",
    items: [
      { productId: chair.id, quantity: QTY, dailyRate: DAILY_RATE },
      { productId: table.id, quantity: 2, dailyRate: EXTRA_PRODUCT.rentalRate },
    ],
  });
  check("Add items REJECTED on COMPLETED order", addItems.ok === false, {
    httpStatus: addItems.status,
    error: addItems.json?.error,
  });

  log("4. Attempt edit quantities on closed order");
  const editQty = await api("PATCH", `/api/rental-orders/${order.id}`, {
    remarks: "Try edit qty after close",
    items: [
      { productId: chair.id, quantity: QTY_EDIT, dailyRate: DAILY_RATE },
    ],
  });
  check("Edit quantities REJECTED on COMPLETED order", editQty.ok === false, {
    httpStatus: editQty.status,
    error: editQty.json?.error,
  });

  const msg = String(editQty.json?.error?.message ?? addItems.json?.error?.message ?? "");
  check(
    "Error cites cannot update in COMPLETED status",
    msg.toLowerCase().includes("cannot") ||
      msg.toLowerCase().includes("completed") ||
      msg.toLowerCase().includes("update"),
    { message: msg },
  );

  const afterEdit = (await apiOrThrow("GET", `/api/rental-orders/${order.id}`)).data;
  check("Order still COMPLETED with original qty", afterEdit.status === "COMPLETED" && afterEdit.items?.[0]?.quantity === QTY, {
    status: afterEdit.status,
    quantity: afterEdit.items?.[0]?.quantity,
    itemCount: afterEdit.items?.length,
  });

  log("5. Add payment (via invoice — not order reopen)");
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S28-${suffix}`,
      rentalOrderId: order.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-09-25",
      notes: "Scenario 28 invoice for payment attempt",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Rental charge",
          quantity: 1,
          unitPrice: INVOICE_TOTAL,
          sortOrder: 0,
        },
      ],
    })
  ).data;
  const issued = (
    await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`)
  ).data;

  const pay = await api("POST", "/api/payments", {
    paymentNumber: `PAY-S28-${suffix}`,
    rentalInvoiceId: issued.id,
    customerId: customer.id,
    paymentDate: END_DATE,
    paymentMethod: "CASH",
    amount: PAYMENT_AMOUNT,
    referenceNumber: "S28-PAY-5000",
    notes: "Payment on closed order invoice",
  });
  let posted = null;
  if (pay.ok) {
    posted = (await apiOrThrow("POST", `/api/payments/${pay.json.data.id}/post`)).data;
  }

  check("Add payment ACCEPTED on invoice for closed order", pay.ok === true && posted?.status === "POSTED", {
    createOk: pay.ok,
    createError: pay.json?.error ?? null,
    paymentStatus: posted?.status,
    amount: posted?.amount,
    note: "Payments attach to invoices, not by reopening the order",
  });

  const orderAfterPay = (await apiOrThrow("GET", `/api/rental-orders/${order.id}`)).data;
  check("Order remains COMPLETED after payment (not reopened)", orderAfterPay.status === "COMPLETED", {
    status: orderAfterPay.status,
  });

  log("6. Audit trail for closed order");
  const auditQueries = [
    `/api/audit?pageSize=50&entityId=${order.id}`,
    `/api/audit?pageSize=50&entityType=RentalOrder&entityId=${order.id}`,
    `/api/audit?pageSize=50&search=${encodeURIComponent(order.orderNumber ?? order.id)}`,
  ];

  let auditItems = [];
  let auditQueryUsed = null;
  for (const q of auditQueries) {
    const res = await api("GET", q);
    if (res.ok) {
      const items = listItems(res.json);
      if (items.length > 0 || auditQueryUsed == null) {
        auditItems = items;
        auditQueryUsed = q;
      }
      if (items.length > 0) break;
    }
  }

  observe("Audit API for order", {
    query: auditQueryUsed,
    count: auditItems.length,
    actions: auditItems.slice(0, 15).map((a) => ({
      action: a.action,
      entityName: a.entityName ?? a.entityType,
      recordId: a.recordId ?? a.entityId,
      createdAt: a.createdAt,
    })),
  });

  const reopenAudited = auditItems.some((a) => {
    const action = String(a.action ?? "").toUpperCase();
    return action === "REOPEN" || action.includes("REOPEN");
  });

  const statusAfterClose = auditItems.map((a) => ({
    action: a.action,
    oldStatus: a.oldValues?.status ?? a.previousValues?.status ?? null,
    newStatus: a.newValues?.status ?? null,
  }));

  observe("Lifecycle statuses in audit (no reopen to DRAFT)", {
    statusAfterClose,
    anyReopenAction: reopenAudited,
  });

  check(
    "No REOPEN audit action recorded",
    reopenAudited === false,
    { reopenAudited, auditCount: auditItems.length },
  );

  const reopenedToEditable = auditItems.some(
    (a) =>
      String(a.newValues?.status ?? "").toUpperCase() === "DRAFT" &&
      String(a.oldValues?.status ?? a.previousValues?.status ?? "")
        .toUpperCase() === "COMPLETED",
  );
  check(
    "Audit shows no COMPLETED → DRAFT reopen transition",
    reopenedToEditable === false,
    { reopenedToEditable },
  );

  const failedUpdatesAudited = auditItems.some(
    (a) =>
      String(a.status ?? "").toUpperCase() === "FAILURE" ||
      String(a.action ?? "").toUpperCase() === "UPDATE",
  );
  observe("Whether blocked update attempts are audited", {
    hasUpdateOrFailureEntries: failedUpdatesAudited,
    note: "Successful lifecycle updates are audited; rejected PATCH may not write FAILURE audit rows",
  });

  const summary = {
    result: "PASS",
    answer: {
      reopenAllowed: false,
      reopenEndpoint: false,
      addItemsAllowed: false,
      editQuantitiesAllowed: false,
      addPaymentsAllowed: true,
      paymentsVia: "rental invoice (order stays COMPLETED)",
      reopenAudited: false,
      orderEditsBlockedWith: editQty.json?.error?.message ?? addItems.json?.error?.message,
    },
    orderId: order.id,
    invoiceId: issued.id,
    paymentId: posted?.id ?? null,
    checks,
    gaps: [
      "No reopen workflow or endpoint",
      "Order edits only in DRAFT — COMPLETED is immutable for items/qty",
      "Payments do not reopen the order",
    ],
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
    },
  };

  console.log("\n========== SCENARIO 28 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 28 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
