/**
 * Scenario 12 – Late Return
 *
 * Contract return date: 20 July
 * Actual return: 23 July (3 days late)
 * Check: late fee, additional rental calculation.
 *
 * Usage: node --env-file=.env scripts/scenario-12-late-return.mjs
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

const START_DATE = "2026-07-19"; // delivery
const CONTRACT_END = "2026-07-20"; // contracted return
const ACTUAL_RETURN = "2026-07-23"; // 3 days late
const LATE_DAYS = 3;
const QTY = 10;
const DAILY_RATE = 50;
const CONTRACT_DAYS = 1;
const CONTRACT_RENTAL = QTY * DAILY_RATE * CONTRACT_DAYS; // 500
const ADDITIONAL_RENTAL = QTY * DAILY_RATE * LATE_DAYS; // 1,500
const EXPECTED_TOTAL_IF_LATE_APPLIED = CONTRACT_RENTAL + ADDITIONAL_RENTAL; // 2,000

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 30,
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

function daysBetween(fromIso, toIso) {
  const a = new Date(`${fromIso}T00:00:00.000Z`).getTime();
  const b = new Date(`${toIso}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
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
        customerCode: `CUST-S12-${stamp()}`,
        name: "Scenario 12 Customer",
        phone: "+92 300 1212121",
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
        warehouseCode: `WH-S12-${stamp()}`,
        name: "Scenario 12 Warehouse",
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
  const computedLateDays = daysBetween(CONTRACT_END, ACTUAL_RETURN);

  log("Scenario 12 – Late Return", {
    contractReturn: CONTRACT_END,
    actualReturn: ACTUAL_RETURN,
    lateDays: computedLateDays,
    expectedAdditionalRental: ADDITIONAL_RENTAL,
  });

  check("Late days = 3 (20 → 23 July)", computedLateDays === LATE_DAYS, {
    computedLateDays,
  });

  await signIn();

  log("0. Check lateFeeEnabled setting (optional)");
  const settingsRes = await api("GET", "/api/settings");
  if (settingsRes.ok) {
    const lateFeeEnabled = settingsRes.json?.data?.company?.lateFeeEnabled ?? false;
    observe("Company lateFeeEnabled flag", {
      lateFeeEnabled,
      note: "Settings flag exists; not wired into return/invoice services",
    });
    if (!lateFeeEnabled) {
      const patch = await api("PATCH", "/api/settings", {
        company: { lateFeeEnabled: true },
      });
      observe("Attempt enable lateFeeEnabled", {
        ok: patch.ok,
        status: patch.status,
        error: patch.json?.error ?? null,
      });
    }
  } else {
    observe("Settings unavailable — skipping lateFeeEnabled toggle", {
      httpStatus: settingsRes.status,
      error: settingsRes.json?.error ?? null,
      note: "lateFeeEnabled lives in settings but is unused by return/invoice logic regardless",
    });
  }

  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Order with contract end 20 July, deliver");
  const orderNumber = `RO-S12-${suffix}`;
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: CONTRACT_END,
      remarks: "Scenario 12 – late return (due 20 Jul, returned 23 Jul)",
      items: [
        { productId: product.id, quantity: QTY, dailyRate: DAILY_RATE },
      ],
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
      dispatchNumber: `DSP-S12-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S12-001",
      driverName: "Scenario 12 Driver",
      driverPhone: "+92 301 1212121",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 12 delivery",
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

  log("2. Actual return on 23 July (3 days late)");
  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S12-${suffix}`,
      rentalOrderId: created.id,
      dispatchId: dispatch.id,
      returnDate: ACTUAL_RETURN,
      remarks: "Late return — 3 days after contract end",
      items: [
        {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchItem.id,
          quantity: QTY,
        },
      ],
    })
  ).data;

  observe("Return created with late returnDate", {
    orderEndDate: CONTRACT_END,
    returnDate: ret.returnDate ?? ACTUAL_RETURN,
    lateDays: computedLateDays,
    returnHasLateFeeField: Object.prototype.hasOwnProperty.call(ret, "lateFee"),
    returnHasLateDaysField: Object.prototype.hasOwnProperty.call(ret, "lateDays"),
    returnHasAdditionalRentalField: Object.prototype.hasOwnProperty.call(
      ret,
      "additionalRental",
    ),
  });

  await apiOrThrow("POST", `/api/returns/${ret.id}/receive`);
  await apiOrThrow("POST", `/api/returns/${ret.id}/inspect`, {
    items: [
      {
        rentalOrderItemId: orderItem.id,
        goodQuantity: QTY,
        damagedQuantity: 0,
        lostQuantity: 0,
        notes: "Returned 3 days late",
      },
    ],
  });
  const returnDone = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/complete`)
  ).data;
  check("Late return still COMPLETED (not blocked)", returnDone.status === "COMPLETED", {
    status: returnDone.status,
  });

  const finalReturn = (await apiOrThrow("GET", `/api/returns/${ret.id}`)).data;
  check(
    "No late fee fields on return record",
    finalReturn.lateFee == null &&
      finalReturn.lateDays == null &&
      finalReturn.additionalRental == null,
    {
      lateFee: finalReturn.lateFee ?? null,
      lateDays: finalReturn.lateDays ?? null,
      additionalRental: finalReturn.additionalRental ?? null,
      keys: Object.keys(finalReturn),
    },
  );

  const orderAfter = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check("Order COMPLETED after late return", orderAfter.status === "COMPLETED", {
    status: orderAfter.status,
    endDate: orderAfter.endDate,
  });

  log("3. Late fee / additional rental auto-calculated?");
  const invoicesAuto = await listOrderInvoices(created.id, customer.id);
  check("No invoice auto-created for late return", invoicesAuto.length === 0, {
    invoiceCount: invoicesAuto.length,
  });

  // Create invoice for contract period only — system won't add late days itself
  const contractInvoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S12A-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: ACTUAL_RETURN,
      dueDate: "2026-07-30",
      notes: "Contract period only (system does not auto-add late days)",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Chair rental × ${QTY} (${CONTRACT_DAYS} day contract)`,
          quantity: QTY,
          unitPrice: DAILY_RATE * CONTRACT_DAYS,
          sortOrder: 0,
        },
      ],
    })
  ).data;

  check(
    "Contract-only invoice = 500 (no auto late/additional rental)",
    Number(contractInvoice.grandTotal) === CONTRACT_RENTAL,
    {
      grandTotal: contractInvoice.grandTotal,
      expectedContract: CONTRACT_RENTAL,
      wouldBeIfLateApplied: EXPECTED_TOTAL_IF_LATE_APPLIED,
    },
  );

  // Manual additional rental for late days
  const withLate = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S12B-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: ACTUAL_RETURN,
      dueDate: "2026-07-30",
      notes: "Manual late/additional rental for 3 days",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Chair rental × ${QTY} (contract ${CONTRACT_DAYS} day)`,
          quantity: QTY,
          unitPrice: DAILY_RATE * CONTRACT_DAYS,
          sortOrder: 0,
        },
        {
          lineType: "MANUAL_CHARGE",
          description: `Additional rental / late fee — ${LATE_DAYS} days × ${QTY} × ${DAILY_RATE}`,
          quantity: 1,
          unitPrice: ADDITIONAL_RENTAL,
          sortOrder: 1,
        },
      ],
    })
  ).data;

  check(
    "Manual additional rental line accepted (= 1,500)",
    Number(withLate.grandTotal) === EXPECTED_TOTAL_IF_LATE_APPLIED,
    {
      grandTotal: withLate.grandTotal,
      contract: CONTRACT_RENTAL,
      additional: ADDITIONAL_RENTAL,
      formula: `${QTY} × ${DAILY_RATE} × ${LATE_DAYS} late days`,
    },
  );

  await apiOrThrow("POST", `/api/rental-invoices/${withLate.id}/issue`);

  const summary = {
    result: "PASS (behavior documented)",
    answers: {
      lateFee:
        "Not auto-generated. lateFeeEnabled setting exists but is unused by return/invoice logic.",
      additionalRentalCalculation:
        "Not automatic. Contract invoice stays at contracted days. Extra days must be added manually (e.g. MANUAL_CHARGE).",
    },
    dates: {
      start: START_DATE,
      contractEnd: CONTRACT_END,
      actualReturn: ACTUAL_RETURN,
      lateDays: computedLateDays,
    },
    expectedManualCalc: {
      contractRental: CONTRACT_RENTAL,
      additionalRental: ADDITIONAL_RENTAL,
      total: EXPECTED_TOTAL_IF_LATE_APPLIED,
    },
    orderNumber,
    rentalOrderId: created.id,
    returnId: finalReturn.id,
    invoiceWithLateId: withLate.id,
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      return: `${BASE}/returns/${finalReturn.id}`,
      invoiceContractOnly: `${BASE}/rental-invoices/${contractInvoice.id}`,
      invoiceWithLate: `${BASE}/rental-invoices/${withLate.id}`,
    },
  };

  console.log("\n========== SCENARIO 12 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 12 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
