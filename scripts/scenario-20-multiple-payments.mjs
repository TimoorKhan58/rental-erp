/**
 * Scenario 20 – Multiple Payments
 *
 * Invoice: PKR 150,000
 * Payments: Cash, Bank Transfer, Easypaisa
 * Check: payment history + outstanding balance
 *
 * Note: System payment methods are CASH | BANK_TRANSFER | CHEQUE | CARD | ONLINE | OTHER.
 * Easypaisa is recorded as ONLINE with reference/notes (no native EASYPAISA enum).
 *
 * Usage: node --env-file=.env scripts/scenario-20-multiple-payments.mjs
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

const TOTAL = 150_000;
const PAY_CASH = 50_000;
const PAY_BANK = 60_000;
const PAY_EASYPAISA = 40_000;
const EXPECTED_PAID = PAY_CASH + PAY_BANK + PAY_EASYPAISA; // 150,000
const EXPECTED_BALANCE = TOTAL - EXPECTED_PAID; // 0

const START_DATE = "2026-08-26";
const END_DATE = "2026-08-27";

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: 50,
  quantity: 10,
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

async function apiSoft(method, path, body) {
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
  const customers = listItems(await api("GET", "/api/customers?pageSize=50"));
  let customer = customers.find((c) => c.isActive !== false) ?? customers[0];
  if (!customer) {
    customer = (
      await api("POST", "/api/customers", {
        customerCode: `CUST-S20-${stamp()}`,
        name: "Scenario 20 Customer",
        phone: "+92 300 2020202",
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
        warehouseCode: `WH-S20-${stamp()}`,
        name: "Scenario 20 Warehouse",
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
      await api("PATCH", `/api/inventory/${row.id}`, {
        quantityOnHand: Math.max(neededOnHand, row.quantityOnHand ?? 0, minAvailable),
      })
    ).data;
  }
  return row;
}

async function completeOrderLifecycle({ customer, warehouse, product, suffix }) {
  const order = (
    await api("POST", "/api/rental-orders", {
      orderNumber: `RO-S20-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 20 – multiple payments",
      items: [
        {
          productId: product.id,
          quantity: PRODUCT.quantity,
          dailyRate: PRODUCT.rentalRate,
        },
      ],
    })
  ).data;

  await api("POST", `/api/rental-orders/${order.id}/confirm`);
  const reserved = (
    await api("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: [{ productId: product.id, quantity: PRODUCT.quantity }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const dispatch = (
    await api("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S20-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S20-001",
      driverName: "Scenario 20 Driver",
      driverPhone: "+92 301 2020202",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 20 delivery",
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity: PRODUCT.quantity,
        },
      ],
    })
  ).data;
  await api("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
  const dispatchDone = (
    await api("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  const dispatchItem = dispatchDone.items?.[0] ?? dispatch.items?.[0];

  const ret = (
    await api("POST", "/api/returns", {
      returnNumber: `RET-S20-${suffix}`,
      rentalOrderId: order.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Scenario 20 full return",
      items: [
        {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchItem.id,
          quantity: PRODUCT.quantity,
        },
      ],
    })
  ).data;
  await api("POST", `/api/returns/${ret.id}/receive`);
  await api("POST", `/api/returns/${ret.id}/inspect`, {
    items: [
      {
        rentalOrderItemId: orderItem.id,
        goodQuantity: PRODUCT.quantity,
        damagedQuantity: 0,
        lostQuantity: 0,
      },
    ],
  });
  await api("POST", `/api/returns/${ret.id}/complete`);

  const completed = (await api("GET", `/api/rental-orders/${order.id}`)).data;
  check("Order COMPLETED after return", completed.status === "COMPLETED", {
    status: completed.status,
  });

  return { order: completed, dispatch, ret };
}

async function listPaymentsForInvoice(invoiceId) {
  const all = listItems(await api("GET", `/api/payments?pageSize=100`));
  return all
    .filter((p) => p.rentalInvoiceId === invoiceId)
    .sort((a, b) => String(a.paymentDate).localeCompare(String(b.paymentDate)));
}

async function postPayment({
  paymentNumber,
  invoiceId,
  customerId,
  paymentDate,
  paymentMethod,
  amount,
  referenceNumber,
  notes,
}) {
  const created = (
    await api("POST", "/api/payments", {
      paymentNumber,
      rentalInvoiceId: invoiceId,
      customerId,
      paymentDate,
      paymentMethod,
      amount,
      referenceNumber,
      notes,
    })
  ).data;
  return (await api("POST", `/api/payments/${created.id}/post`)).data;
}

async function main() {
  const suffix = stamp();

  log("Scenario 20 – Multiple Payments", {
    invoice: TOTAL,
    payments: {
      cash: PAY_CASH,
      bankTransfer: PAY_BANK,
      easypaisa: PAY_EASYPAISA,
    },
    expectedPaid: EXPECTED_PAID,
    expectedBalance: EXPECTED_BALANCE,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Complete rental cycle so invoice is allowed");
  const { order } = await completeOrderLifecycle({
    customer,
    warehouse,
    product,
    suffix,
  });

  log("2. Create & issue invoice for PKR 150,000");
  const invoiceCreated = (
    await api("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S20-${suffix}`,
      rentalOrderId: order.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-09-05",
      notes: "Scenario 20 – total PKR 150,000",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Event rental package (Scenario 20)",
          quantity: 1,
          unitPrice: TOTAL,
          sortOrder: 0,
        },
      ],
    })
  ).data;

  check("Invoice grandTotal is 150,000", Number(invoiceCreated.grandTotal) === TOTAL, {
    grandTotal: invoiceCreated.grandTotal,
  });
  check("Invoice balance starts at 150,000", Number(invoiceCreated.balance) === TOTAL, {
    balance: invoiceCreated.balance,
    paidAmount: invoiceCreated.paidAmount,
  });

  const issued = (
    await api("POST", `/api/rental-invoices/${invoiceCreated.id}/issue`)
  ).data;
  check("Invoice ISSUED", issued.status === "ISSUED", { status: issued.status });

  log("3. Probe native Easypaisa method (expect reject if unsupported)");
  const easypaisaNative = await apiSoft("POST", "/api/payments", {
    paymentNumber: `PAY-S20-EP-NATIVE-${suffix}`,
    rentalInvoiceId: issued.id,
    customerId: customer.id,
    paymentDate: END_DATE,
    paymentMethod: "EASYPAISA",
    amount: 1,
    referenceNumber: "EP-PROBE",
    notes: "Probe native Easypaisa enum",
  });
  observe("Native EASYPAISA payment method", {
    supported: easypaisaNative.ok,
    httpStatus: easypaisaNative.status,
    error: easypaisaNative.json?.error ?? null,
    mappedAs: "ONLINE",
  });

  log("4. Cash payment PKR 50,000");
  const payCash = await postPayment({
    paymentNumber: `PAY-S20-CASH-${suffix}`,
    invoiceId: issued.id,
    customerId: customer.id,
    paymentDate: END_DATE,
    paymentMethod: "CASH",
    amount: PAY_CASH,
    referenceNumber: "S20-CASH-50000",
    notes: "Cash payment",
  });
  check("Cash payment POSTED", payCash.status === "POSTED", {
    amount: payCash.amount,
    method: payCash.paymentMethod,
  });

  let invoice = (await api("GET", `/api/rental-invoices/${issued.id}`)).data;
  check("After cash: paidAmount = 50,000", Number(invoice.paidAmount) === PAY_CASH, {
    paidAmount: invoice.paidAmount,
  });
  check("After cash: balance = 100,000", Number(invoice.balance) === TOTAL - PAY_CASH, {
    balance: invoice.balance,
  });
  check("After cash: PARTIALLY_PAID", invoice.status === "PARTIALLY_PAID", {
    status: invoice.status,
  });

  log("5. Bank Transfer payment PKR 60,000");
  const payBank = await postPayment({
    paymentNumber: `PAY-S20-BANK-${suffix}`,
    invoiceId: issued.id,
    customerId: customer.id,
    paymentDate: "2026-08-28",
    paymentMethod: "BANK_TRANSFER",
    amount: PAY_BANK,
    referenceNumber: "S20-BANK-60000",
    notes: "Bank transfer payment",
  });
  check("Bank Transfer payment POSTED", payBank.status === "POSTED", {
    amount: payBank.amount,
    method: payBank.paymentMethod,
  });

  invoice = (await api("GET", `/api/rental-invoices/${issued.id}`)).data;
  check(
    "After bank: paidAmount = 110,000",
    Number(invoice.paidAmount) === PAY_CASH + PAY_BANK,
    { paidAmount: invoice.paidAmount },
  );
  check(
    "After bank: balance = 40,000",
    Number(invoice.balance) === TOTAL - PAY_CASH - PAY_BANK,
    { balance: invoice.balance },
  );

  log("6. Easypaisa payment PKR 40,000 (recorded as ONLINE)");
  const payEasy = await postPayment({
    paymentNumber: `PAY-S20-EP-${suffix}`,
    invoiceId: issued.id,
    customerId: customer.id,
    paymentDate: "2026-08-29",
    paymentMethod: "ONLINE",
    amount: PAY_EASYPAISA,
    referenceNumber: "EASYPAISA-TXN-S20-40000",
    notes: "Easypaisa wallet payment (mapped to ONLINE)",
  });
  check("Easypaisa (ONLINE) payment POSTED", payEasy.status === "POSTED", {
    amount: payEasy.amount,
    method: payEasy.paymentMethod,
    referenceNumber: payEasy.referenceNumber,
  });

  invoice = (await api("GET", `/api/rental-invoices/${issued.id}`)).data;
  check("Outstanding balance = 0", Number(invoice.balance) === EXPECTED_BALANCE, {
    balance: invoice.balance,
    expected: EXPECTED_BALANCE,
  });
  check("paidAmount = 150,000", Number(invoice.paidAmount) === EXPECTED_PAID, {
    paidAmount: invoice.paidAmount,
  });
  check("Invoice status PAID (fully settled)", invoice.status === "PAID", {
    status: invoice.status,
  });

  log("7. Payment history");
  const history = await listPaymentsForInvoice(issued.id);
  const posted = history.filter((p) => p.status === "POSTED");
  check("Payment history has 3 posted payments", posted.length === 3, {
    count: posted.length,
    payments: posted.map((p) => ({
      paymentNumber: p.paymentNumber,
      amount: p.amount,
      method: p.paymentMethod,
      date: p.paymentDate,
      referenceNumber: p.referenceNumber,
      status: p.status,
    })),
  });

  const methods = new Set(posted.map((p) => p.paymentMethod));
  check(
    "History includes CASH, BANK_TRANSFER, ONLINE",
    methods.has("CASH") && methods.has("BANK_TRANSFER") && methods.has("ONLINE"),
    { methods: [...methods] },
  );
  check(
    "History amounts are 50k + 60k + 40k",
    posted.some((p) => Number(p.amount) === PAY_CASH) &&
      posted.some((p) => Number(p.amount) === PAY_BANK) &&
      posted.some((p) => Number(p.amount) === PAY_EASYPAISA),
    { amounts: posted.map((p) => Number(p.amount)).sort((a, b) => a - b) },
  );

  const summary = {
    result: "PASS",
    answer: {
      paymentHistoryTracked: true,
      outstandingBalance: invoice.balance,
      paidAmount: invoice.paidAmount,
      invoiceStatus: invoice.status,
      methodsUsed: [...methods],
      easypaisaNativeSupported: easypaisaNative.ok,
      easypaisaMappedTo: "ONLINE",
    },
    invoice: {
      id: issued.id,
      number: invoiceCreated.invoiceNumber,
      grandTotal: invoice.grandTotal,
      paidAmount: invoice.paidAmount,
      balance: invoice.balance,
      status: invoice.status,
    },
    paymentHistory: posted.map((p) => ({
      paymentNumber: p.paymentNumber,
      amount: p.amount,
      method: p.paymentMethod,
      date: p.paymentDate,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
      status: p.status,
    })),
    checks,
    notes: [
      "Payments require order COMPLETED + invoice ISSUED.",
      "No native EASYPAISA method — recorded as ONLINE with Easypaisa reference.",
    ],
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
      cash: `${BASE}/payments/${payCash.id}`,
      bank: `${BASE}/payments/${payBank.id}`,
      easypaisa: `${BASE}/payments/${payEasy.id}`,
    },
  };

  console.log("\n========== SCENARIO 20 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 20 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
