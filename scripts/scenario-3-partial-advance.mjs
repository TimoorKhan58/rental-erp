/**
 * Scenario 3 – Partial Advance
 *
 * Total = PKR 100,000
 * Pays: 20,000 then 30,000; remaining after return
 * Check: payment history + remaining balance
 *
 * Note: Payments attach only to issued invoices after order COMPLETED.
 * Flow: order → deliver → return → invoice 100,000 → pay 20k → pay 30k → leave 50k.
 *
 * Usage: node --env-file=.env scripts/scenario-3-partial-advance.mjs
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

const TOTAL = 100_000;
const PAY1 = 20_000;
const PAY2 = 30_000;
const EXPECTED_AFTER_PAY1 = TOTAL - PAY1; // 80,000
const EXPECTED_AFTER_PAY2 = TOTAL - PAY1 - PAY2; // 50,000

const START_DATE = "2026-07-24";
const END_DATE = "2026-07-25";

const LINE_DEFS = [
  {
    key: "tent",
    productCode: "TENT-S1",
    name: "Tent",
    unit: "pcs",
    rentalRate: 5000,
    quantity: 2,
    stock: 10,
  },
];

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
        customerCode: `CUST-S3-${stamp()}`,
        name: "Scenario 3 Partial Advance Customer",
        phone: "+92 300 3334455",
        address: "Lahore, Pakistan",
        notes: "Scenario 3",
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
        warehouseCode: `WH-S3-${stamp()}`,
        name: "Scenario 3 Warehouse",
        isActive: true,
      })
    ).data;
  }
  return warehouse;
}

async function ensureProduct(def) {
  const products = listItems(
    await api(
      "GET",
      `/api/products?pageSize=100&search=${encodeURIComponent(def.productCode)}`,
    ),
  );
  let product =
    products.find((p) => p.productCode === def.productCode) ??
    products.find((p) => p.name?.toLowerCase() === def.name.toLowerCase());
  if (!product) {
    product = (
      await api("POST", "/api/products", {
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

async function ensureStock(productId, warehouseId, minQty) {
  const inventories = listItems(await api("GET", "/api/inventory?pageSize=100"));
  let row = inventories.find(
    (i) => i.productId === productId && i.warehouseId === warehouseId,
  );
  if (!row) {
    return (
      await api("POST", "/api/inventory", {
        productId,
        warehouseId,
        quantityOnHand: minQty,
        reservedQuantity: 0,
        minimumStock: 0,
        maximumStock: Math.max(minQty * 2, 100),
        isActive: true,
      })
    ).data;
  }
  const available =
    row.availableQuantity ??
    (row.quantityOnHand ?? 0) - (row.reservedQuantity ?? 0);
  if (available < minQty) {
    const neededOnHand = (row.reservedQuantity ?? 0) + minQty;
    row = (
      await api("PATCH", `/api/inventory/${row.id}`, {
        quantityOnHand: Math.max(neededOnHand, row.quantityOnHand ?? 0, minQty),
      })
    ).data;
  }
  return row;
}

async function completeOrderLifecycle({
  customer,
  warehouse,
  products,
  suffix,
}) {
  const orderNumber = `RO-S3-${suffix}`;
  const order = (
    await api("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 3 – Partial Advance (invoice total 100,000)",
      items: LINE_DEFS.map((def) => ({
        productId: products[def.key].product.id,
        quantity: def.quantity,
        dailyRate: def.rentalRate,
      })),
    })
  ).data;

  await api("POST", `/api/rental-orders/${order.id}/confirm`);
  const reserved = (
    await api("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: LINE_DEFS.map((def) => ({
        productId: products[def.key].product.id,
        quantity: def.quantity,
      })),
    })
  ).data;

  for (const item of reserved.items ?? []) {
    const def = LINE_DEFS.find(
      (d) => products[d.key].product.id === item.productId,
    );
    if (def) products[def.key].orderItem = item;
  }

  const dispatch = (
    await api("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S3-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S3-001",
      driverName: "Scenario 3 Driver",
      driverPhone: "+92 301 3334444",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 3 delivery",
      items: LINE_DEFS.map((def) => ({
        productId: products[def.key].product.id,
        rentalOrderItemId: products[def.key].orderItem.id,
        quantity: def.quantity,
      })),
    })
  ).data;

  await api("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const dispatchDone = (
    await api("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;

  const dispatchItemsByOrderItem = new Map(
    (dispatchDone.items ?? dispatch.items ?? []).map((di) => [
      di.rentalOrderItemId,
      di,
    ]),
  );

  const ret = (
    await api("POST", "/api/returns", {
      returnNumber: `RET-S3-${suffix}`,
      rentalOrderId: order.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Scenario 3 full return",
      items: LINE_DEFS.map((def) => {
        const orderItem = products[def.key].orderItem;
        return {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchItemsByOrderItem.get(orderItem.id)?.id ?? null,
          quantity: def.quantity,
        };
      }),
    })
  ).data;

  await api("POST", `/api/returns/${ret.id}/receive`);
  await api("POST", `/api/returns/${ret.id}/inspect`, {
    items: LINE_DEFS.map((def) => ({
      rentalOrderItemId: products[def.key].orderItem.id,
      goodQuantity: def.quantity,
      damagedQuantity: 0,
      lostQuantity: 0,
    })),
  });
  await api("POST", `/api/returns/${ret.id}/complete`);

  const completed = (await api("GET", `/api/rental-orders/${order.id}`)).data;
  check("Order COMPLETED after return", completed.status === "COMPLETED", {
    status: completed.status,
  });

  return { order: completed, orderNumber, dispatch, ret };
}

async function listPaymentsForInvoice(invoiceId) {
  const all = listItems(await api("GET", `/api/payments?pageSize=100`));
  return all
    .filter((p) => p.rentalInvoiceId === invoiceId)
    .sort((a, b) => String(a.paymentDate).localeCompare(String(b.paymentDate)));
}

async function main() {
  const suffix = stamp();
  log("Scenario 3 – Partial Advance", {
    total: TOTAL,
    pay1: PAY1,
    pay2: PAY2,
    expectedRemaining: EXPECTED_AFTER_PAY2,
  });

  await signIn();

  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const products = {};
  for (const def of LINE_DEFS) {
    const product = await ensureProduct(def);
    products[def.key] = { ...def, product };
    await ensureStock(product.id, warehouse.id, def.stock);
  }

  log("1. Complete rental cycle (deliver + return) so invoice is allowed");
  const { order, orderNumber } = await completeOrderLifecycle({
    customer,
    warehouse,
    products,
    suffix,
  });

  log("2. Create & issue invoice for PKR 100,000");
  const invoiceNumber = `INV-S3-${suffix}`;
  const invoiceCreated = (
    await api("POST", "/api/rental-invoices", {
      invoiceNumber,
      rentalOrderId: order.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-08-01",
      notes: "Scenario 3 – total PKR 100,000",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Event rental package (Scenario 3)",
          quantity: 1,
          unitPrice: TOTAL,
          sortOrder: 0,
        },
      ],
    })
  ).data;

  check("Invoice grandTotal is 100,000", Number(invoiceCreated.grandTotal) === TOTAL, {
    grandTotal: invoiceCreated.grandTotal,
  });
  check("Invoice balance starts at 100,000", Number(invoiceCreated.balance) === TOTAL, {
    balance: invoiceCreated.balance,
    paidAmount: invoiceCreated.paidAmount,
  });

  const issued = (
    await api("POST", `/api/rental-invoices/${invoiceCreated.id}/issue`)
  ).data;
  check("Invoice ISSUED", issued.status === "ISSUED", { status: issued.status });

  log("3. First payment PKR 20,000");
  const pay1 = (
    await api("POST", "/api/payments", {
      paymentNumber: `PAY-S3A-${suffix}`,
      rentalInvoiceId: issued.id,
      customerId: customer.id,
      paymentDate: END_DATE,
      paymentMethod: "CASH",
      amount: PAY1,
      referenceNumber: "S3-ADV-20000",
      notes: "Scenario 3 first installment 20,000",
    })
  ).data;
  const posted1 = (await api("POST", `/api/payments/${pay1.id}/post`)).data;
  check("Payment 1 POSTED", posted1.status === "POSTED", {
    amount: posted1.amount,
    status: posted1.status,
  });

  const afterPay1 = (await api("GET", `/api/rental-invoices/${issued.id}`)).data;
  check("After 20k: paidAmount = 20,000", Number(afterPay1.paidAmount) === PAY1, {
    paidAmount: afterPay1.paidAmount,
  });
  check("After 20k: remaining balance = 80,000", Number(afterPay1.balance) === EXPECTED_AFTER_PAY1, {
    balance: afterPay1.balance,
  });
  check("After 20k: status PARTIALLY_PAID", afterPay1.status === "PARTIALLY_PAID", {
    status: afterPay1.status,
  });

  let history = await listPaymentsForInvoice(issued.id);
  check("Payment history has 1 posted payment", history.length === 1 && history[0].status === "POSTED", {
    count: history.length,
    amounts: history.map((p) => p.amount),
    statuses: history.map((p) => p.status),
  });

  log("4. Later payment PKR 30,000");
  const pay2 = (
    await api("POST", "/api/payments", {
      paymentNumber: `PAY-S3B-${suffix}`,
      rentalInvoiceId: issued.id,
      customerId: customer.id,
      paymentDate: "2026-07-28",
      paymentMethod: "BANK_TRANSFER",
      amount: PAY2,
      referenceNumber: "S3-ADV-30000",
      notes: "Scenario 3 second installment 30,000",
    })
  ).data;
  const posted2 = (await api("POST", `/api/payments/${pay2.id}/post`)).data;
  check("Payment 2 POSTED", posted2.status === "POSTED", {
    amount: posted2.amount,
    status: posted2.status,
  });

  const afterPay2 = (await api("GET", `/api/rental-invoices/${issued.id}`)).data;
  check("After 30k: paidAmount = 50,000", Number(afterPay2.paidAmount) === PAY1 + PAY2, {
    paidAmount: afterPay2.paidAmount,
  });
  check(
    "Remaining after return/partial pays = 50,000",
    Number(afterPay2.balance) === EXPECTED_AFTER_PAY2,
    { balance: afterPay2.balance, expected: EXPECTED_AFTER_PAY2 },
  );
  check("Still PARTIALLY_PAID (remaining unpaid)", afterPay2.status === "PARTIALLY_PAID", {
    status: afterPay2.status,
  });

  history = await listPaymentsForInvoice(issued.id);
  const postedHistory = history.filter((p) => p.status === "POSTED");
  check("Payment history has 2 posted payments", postedHistory.length === 2, {
    count: postedHistory.length,
    payments: postedHistory.map((p) => ({
      paymentNumber: p.paymentNumber,
      amount: p.amount,
      method: p.paymentMethod,
      date: p.paymentDate,
      status: p.status,
      referenceNumber: p.referenceNumber,
    })),
  });
  check(
    "History amounts are 20,000 then 30,000",
    postedHistory.some((p) => Number(p.amount) === PAY1) &&
      postedHistory.some((p) => Number(p.amount) === PAY2),
    { amounts: postedHistory.map((p) => Number(p.amount)).sort((a, b) => a - b) },
  );

  const summary = {
    result: "PASS",
    orderNumber,
    rentalOrderId: order.id,
    invoiceNumber,
    invoiceId: issued.id,
    grandTotal: afterPay2.grandTotal,
    paymentHistory: postedHistory.map((p) => ({
      paymentNumber: p.paymentNumber,
      amount: p.amount,
      method: p.paymentMethod,
      date: p.paymentDate,
      status: p.status,
      referenceNumber: p.referenceNumber,
    })),
    remainingBalance: afterPay2.balance,
    paidAmount: afterPay2.paidAmount,
    invoiceStatus: afterPay2.status,
    checks,
    notes: [
      "System posts payments only after order COMPLETED + invoice ISSUED (not true pre-delivery advance).",
      "Remaining 50,000 left unpaid as specified.",
    ],
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
      payment1: `${BASE}/payments/${pay1.id}`,
      payment2: `${BASE}/payments/${pay2.id}`,
    },
  };

  console.log("\n========== SCENARIO 3 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 3 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
