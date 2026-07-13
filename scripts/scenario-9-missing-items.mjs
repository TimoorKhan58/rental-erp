/**
 * Scenario 9 – Missing Items
 *
 * Delivered 100 Chairs → Returned 95 good + 5 missing (lost).
 * Check: missing quantity recorded; extra charge generated.
 *
 * Usage: node --env-file=.env scripts/scenario-9-missing-items.mjs
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
const QTY_GOOD = 95;
const QTY_MISSING = 5;
const DAILY_RATE = 50;
const REPLACEMENT_COST = 2000; // per chair — used if manual LOST_ITEM_CHARGE
const START_DATE = "2026-08-05";
const END_DATE = "2026-08-06";
const RENTAL_DAYS = 1;
const RENTAL_TOTAL = QTY * DAILY_RATE * RENTAL_DAYS; // 5,000
const LOST_CHARGE = QTY_MISSING * REPLACEMENT_COST; // 10,000

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
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
        customerCode: `CUST-S9-${stamp()}`,
        name: "Scenario 9 Customer",
        phone: "+92 300 9990011",
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
        warehouseCode: `WH-S9-${stamp()}`,
        name: "Scenario 9 Warehouse",
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
  } else if (
    product.replacementCost == null ||
    Number(product.replacementCost) !== REPLACEMENT_COST
  ) {
    product = (
      await apiOrThrow("PATCH", `/api/products/${product.id}`, {
        replacementCost: REPLACEMENT_COST,
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

  log("Scenario 9 – Missing Items", {
    delivered: QTY,
    returnedGood: QTY_GOOD,
    missing: QTY_MISSING,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Deliver 100 chairs");
  const orderNumber = `RO-S9-${suffix}`;
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 9 – 5 chairs missing on return",
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
      dispatchNumber: `DSP-S9-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S9-001",
      driverName: "Scenario 9 Driver",
      driverPhone: "+92 301 9990000",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 9 delivery 100",
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

  log("2. Return 100 accounted: 95 good + 5 lost (missing)");
  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S9-${suffix}`,
      rentalOrderId: created.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Scenario 9 return with 5 missing",
      items: [
        {
          rentalOrderItemId: orderItem.id,
          dispatchItemId: dispatchItem.id,
          quantity: QTY, // full accountability: 95 good + 5 lost
        },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/returns/${ret.id}/receive`);
  const inspected = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/inspect`, {
      items: [
        {
          rentalOrderItemId: orderItem.id,
          goodQuantity: QTY_GOOD,
          damagedQuantity: 0,
          lostQuantity: QTY_MISSING,
          notes: "5 chairs missing / not returned by customer",
        },
      ],
    })
  ).data;

  const inspectItem = inspected.items?.[0];
  check("Missing quantity recorded as lostQuantity = 5", inspectItem?.lostQuantity === QTY_MISSING, {
    goodQuantity: inspectItem?.goodQuantity,
    damagedQuantity: inspectItem?.damagedQuantity,
    lostQuantity: inspectItem?.lostQuantity,
    returnedQuantity: inspectItem?.returnedQuantity ?? inspectItem?.quantity,
  });
  check("Good quantity recorded = 95", inspectItem?.goodQuantity === QTY_GOOD, {
    goodQuantity: inspectItem?.goodQuantity,
  });

  const completed = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/complete`)
  ).data;
  check("Return COMPLETED", completed.status === "COMPLETED", {
    status: completed.status,
  });

  const finalReturn = (
    await apiOrThrow("GET", `/api/returns/${ret.id}`)
  ).data;
  check(
    "Persisted lostQuantity still 5 after complete",
    finalReturn.items?.[0]?.lostQuantity === QTY_MISSING,
    {
      lostQuantity: finalReturn.items?.[0]?.lostQuantity,
      goodQuantity: finalReturn.items?.[0]?.goodQuantity,
    },
  );

  const orderAfter = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check(
    "Order COMPLETED (lost qty counts toward return accountability)",
    orderAfter.status === "COMPLETED",
    { status: orderAfter.status },
  );

  log("3. Extra charge generated automatically?");
  let invoices = await listOrderInvoices(created.id, customer.id);
  observe("Invoices auto-created after lost return", {
    count: invoices.length,
    invoices: invoices.map((inv) => ({
      id: inv.id,
      number: inv.invoiceNumber,
      status: inv.status,
      grandTotal: inv.grandTotal,
      lines: (inv.items ?? []).map((i) => ({
        lineType: i.lineType,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
    })),
  });

  const autoLostCharges = invoices.flatMap((inv) =>
    (inv.items ?? []).filter(
      (i) =>
        i.lineType === "LOST_ITEM_CHARGE" ||
        i.lineType === "DAMAGE_CHARGE" ||
        String(i.description ?? "")
          .toLowerCase()
          .includes("lost") ||
        String(i.description ?? "")
          .toLowerCase()
          .includes("missing"),
    ),
  );

  check(
    "Extra charge NOT auto-generated on lost return",
    invoices.length === 0 && autoLostCharges.length === 0,
    {
      invoiceCount: invoices.length,
      autoLostChargeLines: autoLostCharges.length,
      note: "Complete return only audits lostQuantity; does not create invoice lines",
    },
  );

  log("4. Manual LOST_ITEM_CHARGE can be added on invoice");
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S9-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-08-13",
      notes: "Scenario 9 – rental + lost item charges",
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
          description: `Missing chairs × ${QTY_MISSING} @ replacement ${REPLACEMENT_COST}`,
          quantity: QTY_MISSING,
          unitPrice: REPLACEMENT_COST,
          sortOrder: 1,
        },
      ],
    })
  ).data;

  const lostLine = (invoice.items ?? []).find(
    (i) => i.lineType === "LOST_ITEM_CHARGE",
  );
  check("Manual LOST_ITEM_CHARGE line accepted", lostLine != null, {
    line: lostLine,
  });
  check(
    "Lost charge amount = 5 × 2000 = 10,000",
    lostLine != null && Number(lostLine.lineTotal) === LOST_CHARGE,
    {
      lineTotal: lostLine?.lineTotal,
      expected: LOST_CHARGE,
    },
  );
  check(
    "Invoice grandTotal includes rental + lost charge",
    Number(invoice.grandTotal) === RENTAL_TOTAL + LOST_CHARGE,
    {
      grandTotal: invoice.grandTotal,
      expected: RENTAL_TOTAL + LOST_CHARGE,
      rental: RENTAL_TOTAL,
      lost: LOST_CHARGE,
    },
  );

  const issued = (
    await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`)
  ).data;

  const summary = {
    result: "PASS (behavior documented)",
    answers: {
      missingQuantityRecorded: true,
      extraChargeGeneratedAutomatically: false,
      extraChargeSupportedManually: true,
    },
    verdict: {
      missingQuantityRecorded:
        "Yes — inspect lostQuantity=5 persisted on return (95 good + 5 lost).",
      extraChargeGenerated:
        "No auto charge. LOST_ITEM_CHARGE line type exists and can be added manually on invoice after COMPLETED.",
    },
    orderNumber,
    rentalOrderId: created.id,
    returnId: finalReturn.id,
    invoiceId: issued.id,
    quantities: {
      delivered: QTY,
      good: QTY_GOOD,
      missingLost: QTY_MISSING,
    },
    charges: {
      autoGenerated: false,
      manualLostItemCharge: LOST_CHARGE,
      invoiceGrandTotal: issued.grandTotal,
    },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      return: `${BASE}/returns/${finalReturn.id}`,
      invoice: `${BASE}/rental-invoices/${issued.id}`,
    },
  };

  console.log("\n========== SCENARIO 9 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 9 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
