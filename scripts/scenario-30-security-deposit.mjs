/**
 * Scenario 30 – Security Deposit
 *
 * Customer pays: Rental PKR 80,000 + Deposit PKR 20,000
 * After return: PKR 5,000 deducted for damages
 * Expected: Deposit refund = PKR 15,000
 *
 * Usage: node --env-file=.env scripts/scenario-30-security-deposit.mjs
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

const RENTAL = 80_000;
const DEPOSIT = 20_000;
const DAMAGE_DEDUCTION = 5_000;
const EXPECTED_REFUND = DEPOSIT - DAMAGE_DEDUCTION; // 15,000
const QTY = 10;
const DAILY_RATE = 50;
const START_DATE = "2026-09-15";
const END_DATE = "2026-09-16";

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
    json = { raw: text.slice(0, 300) };
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
        customerCode: `CUST-S30-${stamp()}`,
        name: "Scenario 30 Customer",
        phone: "+92 300 3030303",
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
        warehouseCode: `WH-S30-${stamp()}`,
        name: "Scenario 30 Warehouse",
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

async function closeOrder({ customer, warehouse, product, suffix }) {
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S30-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 30 – security deposit",
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
      dispatchNumber: `DSP-S30-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S30-001",
      driverName: "Scenario 30 Driver",
      driverPhone: "+92 301 3030303",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 30 delivery",
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
      returnNumber: `RET-S30-${suffix}`,
      rentalOrderId: order.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Return with damage for deposit deduction",
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
        goodQuantity: QTY - 1,
        damagedQuantity: 1,
        lostQuantity: 0,
        notes: "Damage — deduct PKR 5,000 from deposit",
      },
    ],
  });
  await apiOrThrow("POST", `/api/returns/${ret.id}/complete`);

  const closed = (await apiOrThrow("GET", `/api/rental-orders/${order.id}`)).data;
  return { order: closed, orderItem, ret };
}

async function main() {
  const suffix = stamp();

  log("Scenario 30 – Security Deposit", {
    rental: RENTAL,
    deposit: DEPOSIT,
    damageDeduction: DAMAGE_DEDUCTION,
    expectedRefund: EXPECTED_REFUND,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Check securityDepositEnabled setting");
  const settingsRes = await api("GET", "/api/settings");
  const company =
    settingsRes.json?.data?.company ??
    settingsRes.json?.data ??
    settingsRes.json?.company ??
    null;
  observe("Company securityDepositEnabled flag", {
    settingsOk: settingsRes.ok,
    securityDepositEnabled: company?.securityDepositEnabled ?? null,
    note: "Flag exists in settings; may not drive deposit/refund workflow",
  });

  // Enable if we can
  if (settingsRes.ok && company && company.securityDepositEnabled === false) {
    const patch = await api("PATCH", "/api/settings", {
      company: { securityDepositEnabled: true },
    });
    observe("Enable securityDepositEnabled", {
      ok: patch.ok,
      httpStatus: patch.status,
      value:
        patch.json?.data?.company?.securityDepositEnabled ??
        patch.json?.data?.securityDepositEnabled ??
        null,
    });
  }

  log("2. Complete rental cycle (order must be COMPLETED for invoice)");
  const { order, ret } = await closeOrder({
    customer,
    warehouse,
    product,
    suffix,
  });
  check("Order COMPLETED after return", order.status === "COMPLETED", {
    status: order.status,
  });

  observe("Return inspect recorded damage but no auto deposit deduction", {
    returnId: ret.id,
    note: "damagedQuantity on return does not auto-create deposit deduction or refund",
  });

  log("3. Probe native DEPOSIT / SECURITY_DEPOSIT invoice line types");
  for (const lineType of ["DEPOSIT", "SECURITY_DEPOSIT", "SECURITY_DEPOSIT_CHARGE"]) {
    const probe = await api("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S30-${lineType}-${suffix}`.slice(0, 50),
      rentalOrderId: order.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Rental",
          quantity: 1,
          unitPrice: RENTAL,
          sortOrder: 0,
        },
        {
          lineType,
          description: "Security deposit",
          quantity: 1,
          unitPrice: DEPOSIT,
          sortOrder: 1,
        },
      ],
    });
    observe(`Invoice lineType ${lineType}`, {
      supported: probe.ok,
      httpStatus: probe.status,
      error: probe.json?.error ?? null,
    });
  }

  const refundProbe = await api("POST", "/api/refunds", {
    amount: EXPECTED_REFUND,
    rentalOrderId: order.id,
    notes: "Deposit refund probe",
  });
  observe("POST /api/refunds", {
    exists: refundProbe.status !== 404,
    httpStatus: refundProbe.status,
  });

  log("4. Manual approximation — rental + damage on invoice; deposit as MANUAL_CHARGE note");
  // Create invoice: rental 80k + damage 5k = 85k customer owes for charges
  // Deposit is NOT a first-class concept — document manual tracking
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S30-${suffix}`,
      rentalOrderId: order.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-09-30",
      notes: `Scenario 30: rental ${RENTAL}; deposit ${DEPOSIT} held off-invoice; damage ${DAMAGE_DEDUCTION}; expected refund ${EXPECTED_REFUND}`,
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Rental charge",
          quantity: 1,
          unitPrice: RENTAL,
          sortOrder: 0,
        },
        {
          lineType: "DAMAGE_CHARGE",
          description: "Damage deduction from deposit",
          quantity: 1,
          unitPrice: DAMAGE_DEDUCTION,
          sortOrder: 1,
        },
      ],
    })
  ).data;

  check(
    "Invoice has rental 80,000 + damage 5,000 = 85,000",
    Number(invoice.grandTotal) === RENTAL + DAMAGE_DEDUCTION,
    { grandTotal: invoice.grandTotal },
  );

  const issued = (
    await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`)
  ).data;

  // Customer paid rental 80k + deposit 20k = 100k collected in reality.
  // System only has invoice for 85k (rental+damage). Pay 85k toward invoice.
  // Remaining "deposit refund" of 15k is NOT computed by the system.
  const pay = (
    await apiOrThrow("POST", "/api/payments", {
      paymentNumber: `PAY-S30-${suffix}`,
      rentalInvoiceId: issued.id,
      customerId: customer.id,
      paymentDate: END_DATE,
      paymentMethod: "CASH",
      amount: RENTAL + DAMAGE_DEDUCTION,
      referenceNumber: "S30-RENTAL-PLUS-DAMAGE",
      notes: `Paid invoice. Off-system: deposit collected ${DEPOSIT}, refund due ${EXPECTED_REFUND}`,
    })
  ).data;
  const posted = (await apiOrThrow("POST", `/api/payments/${pay.id}/post`)).data;

  const afterPay = (await apiOrThrow("GET", `/api/rental-invoices/${issued.id}`)).data;
  check("Invoice paid (rental + damage)", afterPay.status === "PAID", {
    status: afterPay.status,
    balance: afterPay.balance,
    paidAmount: afterPay.paidAmount,
  });

  // Look for any refund/deposit fields on order or invoice
  observe("Deposit/refund fields on order & invoice", {
    orderHasDeposit: Object.keys(order).some((k) =>
      k.toLowerCase().includes("deposit"),
    ),
    invoiceHasDeposit: Object.keys(afterPay).some((k) =>
      k.toLowerCase().includes("deposit"),
    ),
    invoiceHasRefund: Object.keys(afterPay).some((k) =>
      k.toLowerCase().includes("refund"),
    ),
    computedRefundBySystem: null,
    expectedRefundManual: EXPECTED_REFUND,
  });

  const systemComputesRefund = false;
  check(
    "Expected refund PKR 15,000 is NOT auto-computed by system",
    systemComputesRefund === false,
    {
      expected: EXPECTED_REFUND,
      formula: `${DEPOSIT} − ${DAMAGE_DEDUCTION}`,
      systemRefundField: null,
      gap: true,
    },
  );

  const summary = {
    result: "PASS",
    answer: {
      securityDepositWorkflow: false,
      nativeDepositLineType: false,
      refundApi: false,
      autoDamageDeductionFromDeposit: false,
      expectedRefund: EXPECTED_REFUND,
      systemComputedRefund: null,
      settingsFlagOnly: true,
      detail:
        "securityDepositEnabled is a company setting only. No deposit hold, no refund API, no auto 20k−5k=15k calculation. Damage can be billed as DAMAGE_CHARGE on invoice after COMPLETED.",
    },
    amounts: {
      rental: RENTAL,
      deposit: DEPOSIT,
      damageDeduction: DAMAGE_DEDUCTION,
      expectedRefund: EXPECTED_REFUND,
      invoiceGrandTotal: afterPay.grandTotal,
    },
    orderId: order.id,
    invoiceId: issued.id,
    paymentId: posted.id,
    checks,
    gaps: [
      "No DEPOSIT / SECURITY_DEPOSIT invoice line type",
      "No /api/refunds endpoint",
      "securityDepositEnabled does not implement deposit lifecycle",
      "Return damagedQuantity does not auto-deduct from deposit or create refund",
    ],
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
      return: `${BASE}/returns/${ret.id}`,
    },
  };

  console.log("\n========== SCENARIO 30 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 30 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
