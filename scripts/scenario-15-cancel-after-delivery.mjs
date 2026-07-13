/**
 * Scenario 15 – Cancel After Delivery
 *
 * Customer cancels after truck has already left.
 * Check: delivery charges, cancellation policy.
 *
 * Usage: node --env-file=.env scripts/scenario-15-cancel-after-delivery.mjs
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

const QTY = 30;
const DAILY_RATE = 50;
const DELIVERY_CHARGE = 5000;
const START_DATE = "2026-08-18";
const END_DATE = "2026-08-19";

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
        customerCode: `CUST-S15-${stamp()}`,
        name: "Scenario 15 Customer",
        phone: "+92 300 1515151",
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
        warehouseCode: `WH-S15-${stamp()}`,
        name: "Scenario 15 Warehouse",
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

  log("Scenario 15 – Cancel After Delivery", {
    situation: "Truck already left / dispatch completed",
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Create order → reserve → dispatch truck (delivery completed)");
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S15-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 15 – cancel after truck left",
      items: [
        { productId: product.id, quantity: QTY, dailyRate: DAILY_RATE },
      ],
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
      dispatchNumber: `DSP-S15-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S15-001",
      driverName: "Scenario 15 Driver",
      driverPhone: "+92 301 1515151",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Truck left for delivery",
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

  const afterDelivery = (
    await apiOrThrow("GET", `/api/rental-orders/${order.id}`)
  ).data;
  check(
    "Order ON_RENT after truck left (dispatch completed)",
    afterDelivery.status === "ON_RENT",
    {
      orderStatus: afterDelivery.status,
      dispatchStatus: dispatchDone.status,
    },
  );

  // Also try cancel right after dispatch READY but before complete? User said truck left = completed.
  // Optionally probe cancel when DISPATCHED mid-state — skip, focus on after complete.

  log("2. Cancellation policy — attempt cancel after delivery");
  const cancelRes = await api("POST", `/api/rental-orders/${order.id}/cancel`);
  check(
    "Cancel after delivery is BLOCKED",
    cancelRes.ok === false,
    {
      httpStatus: cancelRes.status,
      error: cancelRes.json?.error,
    },
  );

  const orderAfterCancel = (
    await apiOrThrow("GET", `/api/rental-orders/${order.id}`)
  ).data;
  check(
    "Order remains ON_RENT (cancellation policy = hard block, not fee-based)",
    orderAfterCancel.status === "ON_RENT",
    { status: orderAfterCancel.status },
  );

  observe("Cancellation policy observed", {
    allowedStatuses: ["DRAFT", "CONFIRMED (with zero reserved)"],
    blockedAfterDelivery: true,
    policyEngine: false,
    feeSchedule: false,
    note: "No configurable cancel policy (e.g. % fee after dispatch). System simply rejects cancel past CONFIRMED/unreserved.",
  });

  // Try canceling the completed dispatch itself
  const cancelDispatch = await api("POST", `/api/dispatches/${dispatch.id}/cancel`);
  observe("Cancel completed dispatch", {
    httpStatus: cancelDispatch.status,
    ok: cancelDispatch.ok,
    error: cancelDispatch.json?.error ?? null,
    note: "Even if dispatch cancel existed, order cancel after delivery is still blocked",
  });

  log("3. Delivery charges on cancel-after-delivery");
  const invoicesAuto = await listOrderInvoices(order.id, customer.id);
  check(
    "No delivery charge auto-generated when cancel attempted",
    invoicesAuto.length === 0,
    { invoiceCount: invoicesAuto.length },
  );

  // Delivery charge cannot be invoiced until COMPLETED
  const earlyDeliveryInvoice = await api("POST", "/api/rental-invoices", {
    invoiceNumber: `INV-S15-EARLY-${suffix}`,
    rentalOrderId: order.id,
    customerId: customer.id,
    invoiceDate: START_DATE,
    notes: "Attempt delivery charge while ON_RENT after cancel request",
    items: [
      {
        lineType: "DELIVERY_CHARGE",
        description: "Delivery charge — truck already left",
        quantity: 1,
        unitPrice: DELIVERY_CHARGE,
        sortOrder: 0,
      },
    ],
  });
  check(
    "DELIVERY_CHARGE invoice blocked while ON_RENT",
    earlyDeliveryInvoice.ok === false,
    {
      httpStatus: earlyDeliveryInvoice.status,
      error: earlyDeliveryInvoice.json?.error,
    },
  );

  // Complete return so we can show manual DELIVERY_CHARGE is supported after close
  log("4. After forced return/close — DELIVERY_CHARGE can be billed manually");
  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S15-${suffix}`,
      rentalOrderId: order.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Return after failed cancel-after-delivery",
      items: [
        {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchDone.items?.[0]?.id ?? dispatch.items?.[0]?.id,
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
    await apiOrThrow("GET", `/api/rental-orders/${order.id}`)
  ).data;
  check("Order COMPLETED via return (not cancel)", completed.status === "COMPLETED", {
    status: completed.status,
  });

  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S15-${suffix}`,
      rentalOrderId: order.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-08-26",
      notes: "Manual delivery charge after completed rental (cancel was blocked)",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Chair rental × ${QTY}`,
          quantity: QTY,
          unitPrice: DAILY_RATE,
          sortOrder: 0,
        },
        {
          lineType: "DELIVERY_CHARGE",
          description: "Delivery charge — truck dispatched",
          quantity: 1,
          unitPrice: DELIVERY_CHARGE,
          sortOrder: 1,
        },
      ],
    })
  ).data;

  const deliveryLine = (invoice.items ?? []).find(
    (i) => i.lineType === "DELIVERY_CHARGE",
  );
  check(
    "Manual DELIVERY_CHARGE line type accepted after COMPLETED",
    deliveryLine != null && Number(deliveryLine.lineTotal) === DELIVERY_CHARGE,
    { line: deliveryLine },
  );
  await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`);

  const summary = {
    result: "PASS (behavior documented)",
    answers: {
      deliveryCharges:
        "Not auto-applied on cancel-after-delivery. DELIVERY_CHARGE exists but only as a manual invoice line after COMPLETED.",
      cancellationPolicy:
        "Hard block only — cancel rejected after delivery (ON_RENT). No fee schedule / policy rules engine.",
    },
    orderId: order.id,
    dispatchId: dispatch.id,
    orderStatusAfterTruckLeft: afterDelivery.status,
    cancelAttempt: cancelRes.json?.error ?? null,
    checks,
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      dispatch: `${BASE}/dispatches/${dispatch.id}`,
      invoice: `${BASE}/rental-invoices/${invoice.id}`,
    },
  };

  console.log("\n========== SCENARIO 15 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 15 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
