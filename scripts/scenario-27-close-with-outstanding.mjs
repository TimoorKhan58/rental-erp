/**
 * Scenario 27 – Close Order With Outstanding Balance
 *
 * Customer still owes PKR 20,000.
 * Try to close the order.
 * Check: blocks closure, or allows with warning?
 *
 * Note: In this system, order "close" = full return → status COMPLETED.
 * Invoices/payments only exist after COMPLETED, so outstanding balance
 * cannot block closure via the payment path. This script documents that.
 *
 * Usage: node --env-file=.env scripts/scenario-27-close-with-outstanding.mjs
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

const INVOICE_TOTAL = 50_000;
const PAID = 30_000;
const OUTSTANDING = 20_000; // INVOICE_TOTAL - PAID
const QTY = 10;
const DAILY_RATE = 50;
const START_DATE = "2026-09-09";
const END_DATE = "2026-09-10";

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
        customerCode: `CUST-S27-${stamp()}`,
        name: "Scenario 27 Customer",
        phone: "+92 300 2727272",
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
        warehouseCode: `WH-S27-${stamp()}`,
        name: "Scenario 27 Warehouse",
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

  log("Scenario 27 – Close Order With Outstanding Balance", {
    invoiceTotal: INVOICE_TOTAL,
    paid: PAID,
    outstanding: OUTSTANDING,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Deliver + fully return (order close = COMPLETED)");
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S27-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 27 – close with outstanding balance",
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
      dispatchNumber: `DSP-S27-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S27-001",
      driverName: "Scenario 27 Driver",
      driverPhone: "+92 301 2727272",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 27 delivery",
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

  // Close attempt: complete return with zero payments / no invoice yet
  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S27-${suffix}`,
      rentalOrderId: order.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Scenario 27 full return = close order",
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
  const returnDone = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/complete`)
  ).data;

  check("Return complete succeeded (no payment required)", returnDone.status === "COMPLETED", {
    status: returnDone.status,
  });

  const closed = (await apiOrThrow("GET", `/api/rental-orders/${order.id}`)).data;
  check("Order closed as COMPLETED with no invoice/payment", closed.status === "COMPLETED", {
    status: closed.status,
    note: "Closure does not check outstanding balance — invoice not even creatable until COMPLETED",
  });

  observe("Order close vs payments", {
    closeMechanism: "Full return complete → rental order COMPLETED",
    paymentRequiredToClose: false,
    warningOnClose: false,
    dedicatedCloseEndpoint: false,
    routes: ["confirm", "reserve", "cancel", "PATCH update"],
  });

  log("2. Create invoice 50,000 and leave outstanding 20,000");
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S27-${suffix}`,
      rentalOrderId: closed.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-09-20",
      notes: "Scenario 27 – leave 20k outstanding",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Rental package",
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

  const pay = (
    await apiOrThrow("POST", "/api/payments", {
      paymentNumber: `PAY-S27-${suffix}`,
      rentalInvoiceId: issued.id,
      customerId: customer.id,
      paymentDate: END_DATE,
      paymentMethod: "CASH",
      amount: PAID,
      referenceNumber: "S27-PARTIAL-30000",
      notes: "Partial payment — leave 20,000 outstanding",
    })
  ).data;
  await apiOrThrow("POST", `/api/payments/${pay.id}/post`);

  const afterPay = (await apiOrThrow("GET", `/api/rental-invoices/${issued.id}`)).data;
  check("Outstanding balance = 20,000", Number(afterPay.balance) === OUTSTANDING, {
    balance: afterPay.balance,
    paidAmount: afterPay.paidAmount,
    status: afterPay.status,
  });
  check("Invoice PARTIALLY_PAID", afterPay.status === "PARTIALLY_PAID", {
    status: afterPay.status,
  });

  log("3. With 20k outstanding — probe close / re-close behaviors");
  const orderNow = (await apiOrThrow("GET", `/api/rental-orders/${order.id}`)).data;
  check(
    "Order remains COMPLETED while invoice still owes 20,000",
    orderNow.status === "COMPLETED",
    {
      orderStatus: orderNow.status,
      invoiceBalance: afterPay.balance,
      invoiceStatus: afterPay.status,
    },
  );

  const closeProbe = await api("POST", `/api/rental-orders/${order.id}/close`);
  observe("POST /api/rental-orders/:id/close", {
    exists: closeProbe.status !== 404,
    httpStatus: closeProbe.status,
    error: closeProbe.json?.error ?? closeProbe.json ?? null,
  });

  const completeProbe = await api("POST", `/api/rental-orders/${order.id}/complete`);
  observe("POST /api/rental-orders/:id/complete", {
    exists: completeProbe.status !== 404,
    httpStatus: completeProbe.status,
    error: completeProbe.json?.error ?? completeProbe.json ?? null,
  });

  // Order already closed; outstanding does not reopen or block status
  observe("Outstanding balance effect on closed order", {
    blocksClosure: false,
    allowsWithWarning: false,
    reality:
      "Order is already COMPLETED before any invoice exists. Outstanding 20k lives on the invoice only; order stays COMPLETED with no warning flag.",
  });

  const summary = {
    result: "PASS",
    answer: {
      blocksClosure: false,
      allowsWithWarning: false,
      allowsSilently: true,
      detail:
        "Order closes via full return → COMPLETED with no payment/invoice check. Outstanding PKR 20,000 is invoice-level after close; order stays COMPLETED.",
      outstandingBalance: afterPay.balance,
      orderStatusWithOutstanding: orderNow.status,
      invoiceStatus: afterPay.status,
    },
    orderId: order.id,
    invoiceId: issued.id,
    checks,
    gaps: [
      "No dedicated close-order endpoint",
      "No outstanding-balance gate on return complete / COMPLETED",
      "No warning payload when closing unpaid rentals",
      "Payments only after order COMPLETED + invoice ISSUED",
    ],
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
      return: `${BASE}/returns/${ret.id}`,
    },
  };

  console.log("\n========== SCENARIO 27 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 27 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
