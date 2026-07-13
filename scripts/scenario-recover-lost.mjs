/**
 * Scenario – Recover lost item + refund
 *
 * Delivered 100 Chairs → return 99 good + 1 lost → charge lost fee → pay invoice →
 * later recover the lost chair → stock IN + refund posted.
 *
 * Usage: node --env-file=.env scripts/scenario-recover-lost.mjs
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
const QTY_GOOD = 99;
const QTY_LOST = 1;
const DAILY_RATE = 50;
const REPLACEMENT_COST = 2000;
const START_DATE = "2026-09-01";
const END_DATE = "2026-09-02";
const RENTAL_DAYS = 1;
const RENTAL_TOTAL = QTY * DAILY_RATE * RENTAL_DAYS;
const LOST_CHARGE = QTY_LOST * REPLACEMENT_COST;

const PRODUCT = {
  productCode: "CHAIR-RL",
  name: "Chair Recover Lost",
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
        customerCode: `CUST-RL-${stamp()}`,
        name: "Recover Lost Customer",
        phone: "+92 300 8880011",
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
        warehouseCode: `WH-RL-${stamp()}`,
        name: "Recover Lost Warehouse",
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
        replacementCost: REPLACEMENT_COST,
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
      await apiOrThrow("PATCH", `/api/inventory/${row.id}`, {
        quantityOnHand: Math.max(neededOnHand, row.quantityOnHand ?? 0, minAvailable),
      })
    ).data;
  }
  return row;
}

async function main() {
  const suffix = stamp();

  log("Scenario – Recover lost item + refund", {
    delivered: QTY,
    returnedGood: QTY_GOOD,
    lost: QTY_LOST,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  const inventoryBefore = await ensureStock(product.id, warehouse.id, PRODUCT.stock);
  const onHandBeforeFlow = inventoryBefore.quantityOnHand ?? 0;

  log("1. Deliver 100 chairs");
  const orderNumber = `RO-RL-${suffix}`;
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Recover lost scenario",
      items: [{ productId: product.id, quantity: QTY, dailyRate: DAILY_RATE }],
    })
  ).data;

  await apiOrThrow("POST", `/api/rental-orders/${created.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${created.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const dispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-RL-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-RL-001",
      driverName: "Recover Lost Driver",
      driverPhone: "+92 301 8880000",
      deliveryAddress: customer.address ?? "Customer site",
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

  log("2. Return 99 good + 1 lost");
  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-RL-${suffix}`,
      rentalOrderId: created.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "99 good, 1 lost",
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
        goodQuantity: QTY_GOOD,
        damagedQuantity: 0,
        lostQuantity: QTY_LOST,
      },
    ],
  });
  await apiOrThrow("POST", `/api/returns/${ret.id}/complete`);

  const afterCompleteInv = listItems(
    await apiOrThrow("GET", `/api/inventory?pageSize=100`),
  ).find((i) => i.productId === product.id && i.warehouseId === warehouse.id);

  log("3. Invoice lost charge + pay in full");
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-RL-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-09-10",
      notes: "Rental + lost chair charge",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Chair rental × ${QTY}`,
          quantity: QTY,
          unitPrice: DAILY_RATE * RENTAL_DAYS,
          sortOrder: 0,
        },
        {
          lineType: "LOST_ITEM_CHARGE",
          description: `Lost chair × ${QTY_LOST}`,
          quantity: QTY_LOST,
          unitPrice: REPLACEMENT_COST,
          sortOrder: 1,
        },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`);

  const payment = (
    await apiOrThrow("POST", "/api/payments", {
      paymentNumber: `PAY-RL-${suffix}`,
      rentalInvoiceId: invoice.id,
      customerId: customer.id,
      paymentDate: END_DATE,
      paymentMethod: "CASH",
      amount: RENTAL_TOTAL + LOST_CHARGE,
      notes: "Full settlement including lost charge",
    })
  ).data;
  await apiOrThrow("POST", `/api/payments/${payment.id}/post`);

  const paidInvoice = (
    await apiOrThrow("GET", `/api/rental-invoices/${invoice.id}`)
  ).data;
  check("Invoice PAID after settlement", paidInvoice.status === "PAID", {
    status: paidInvoice.status,
    paidAmount: paidInvoice.paidAmount,
  });

  const onHandAfterReturn = afterCompleteInv?.quantityOnHand ?? 0;

  log("4. Recover lost chair with refund");
  const recovered = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/recover-lost`, {
      items: [{ rentalOrderItemId: orderItem.id, quantity: QTY_LOST }],
      refund: {
        rentalInvoiceId: invoice.id,
        amount: LOST_CHARGE,
        paymentNumber: `PAY-RL-REF-${suffix}`,
        paymentMethod: "CASH",
        notes: "Refund for recovered lost chair",
      },
    })
  ).data;

  check("Return lostQuantity now 0", recovered.return?.items?.[0]?.lostQuantity === 0, {
    lostQuantity: recovered.return?.items?.[0]?.lostQuantity,
    goodQuantity: recovered.return?.items?.[0]?.goodQuantity,
  });
  check(
    "Return goodQuantity increased by recovered qty",
    recovered.return?.items?.[0]?.goodQuantity === QTY_GOOD + QTY_LOST,
    { goodQuantity: recovered.return?.items?.[0]?.goodQuantity },
  );
  check("Refund payment posted", recovered.refund?.status === "POSTED", {
    refund: recovered.refund,
  });
  check("Refund flagged isRefund=true", recovered.refund?.isRefund === true, {
    isRefund: recovered.refund?.isRefund,
  });
  check("Refund amount equals lost charge", Number(recovered.refund?.amount) === LOST_CHARGE, {
    amount: recovered.refund?.amount,
    expected: LOST_CHARGE,
  });

  const afterRecoverInv = listItems(
    await apiOrThrow("GET", `/api/inventory?pageSize=100`),
  ).find((i) => i.productId === product.id && i.warehouseId === warehouse.id);

  check(
    "Stock increased by recovered qty",
    Number(afterRecoverInv?.quantityOnHand) === Number(onHandAfterReturn) + QTY_LOST,
    {
      beforeRecover: onHandAfterReturn,
      afterRecover: afterRecoverInv?.quantityOnHand,
      onHandBeforeFlow,
    },
  );

  const invoiceAfter = (
    await apiOrThrow("GET", `/api/rental-invoices/${invoice.id}`)
  ).data;
  check(
    "Invoice paidAmount reduced by refund",
    Number(invoiceAfter.paidAmount) === RENTAL_TOTAL + LOST_CHARGE - LOST_CHARGE,
    {
      paidAmount: invoiceAfter.paidAmount,
      status: invoiceAfter.status,
      balance: invoiceAfter.balance,
    },
  );

  const summary = {
    result: "PASS",
    orderNumber,
    returnId: ret.id,
    invoiceId: invoice.id,
    refundPaymentId: recovered.refund?.id,
    quantities: { delivered: QTY, good: QTY_GOOD, lostThenRecovered: QTY_LOST },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      return: `${BASE}/returns/${ret.id}`,
      invoice: `${BASE}/rental-invoices/${invoice.id}`,
    },
  };

  console.log("\n========== RECOVER LOST RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nRECOVER LOST SCENARIO FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
