/**
 * Scenario 11 – Dirty Return
 *
 * Customer returns carpets covered in mud.
 * Check: cleaning charge, cleaning status.
 *
 * Usage: node --env-file=.env scripts/scenario-11-dirty-return.mjs
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

const QTY = 5;
const DAILY_RATE = 1000;
const CLEANING_CHARGE = 2500; // customer charge for muddy carpets
const CLEANING_COST = 800; // internal maintenance estimated cost
const START_DATE = "2026-08-09";
const END_DATE = "2026-08-10";
const RENTAL_DAYS = 1;
const RENTAL_TOTAL = QTY * DAILY_RATE * RENTAL_DAYS;

const PRODUCT = {
  productCode: "CARPET-S11",
  name: "Carpet",
  unit: "pcs",
  rentalRate: DAILY_RATE,
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
        customerCode: `CUST-S11-${stamp()}`,
        name: "Scenario 11 Customer",
        phone: "+92 300 1112233",
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
        warehouseCode: `WH-S11-${stamp()}`,
        name: "Scenario 11 Warehouse",
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
    products.find((p) => p.name?.toLowerCase() === "carpet");
  if (!product) {
    product = (
      await apiOrThrow("POST", "/api/products", {
        productCode: PRODUCT.productCode,
        name: PRODUCT.name,
        unit: PRODUCT.unit,
        rentalRate: PRODUCT.rentalRate,
        description: "Event carpet",
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
        maximumStock: Math.max(minAvailable * 2, 50),
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

  log("Scenario 11 – Dirty Return", {
    product: "Carpet",
    qty: QTY,
    condition: "covered in mud",
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  const inventory = await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Rent and deliver carpets");
  const orderNumber = `RO-S11-${suffix}`;
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 11 – dirty muddy carpet return",
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
      dispatchNumber: `DSP-S11-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S11-001",
      driverName: "Scenario 11 Driver",
      driverPhone: "+92 301 1112222",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 11 carpet delivery",
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

  log("2. Dirty return — carpets covered in mud");
  observe("Return conditions available", {
    conditions: ["GOOD", "DAMAGED", "LOST"],
    hasDirty: false,
    note: "No DIRTY condition — muddy return noted in inspection notes; marked GOOD so items restock",
  });

  const ret = (
    await apiOrThrow("POST", "/api/returns", {
      returnNumber: `RET-S11-${suffix}`,
      rentalOrderId: created.id,
      dispatchId: dispatch.id,
      returnDate: END_DATE,
      remarks: "Carpets returned covered in mud — need cleaning",
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
  const inspected = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/inspect`, {
      items: [
        {
          rentalOrderItemId: orderItem.id,
          goodQuantity: QTY,
          damagedQuantity: 0,
          lostQuantity: 0,
          notes: "DIRTY: carpets covered in mud — cleaning required before next rental",
        },
      ],
    })
  ).data;

  check(
    "Dirty condition captured only via notes (not a first-class status)",
    String(inspected.items?.[0]?.notes ?? "").toLowerCase().includes("mud") ||
      String(inspected.items?.[0]?.notes ?? "").toLowerCase().includes("dirty"),
    { notes: inspected.items?.[0]?.notes },
  );

  const returnDone = (
    await apiOrThrow("POST", `/api/returns/${ret.id}/complete`)
  ).data;
  check("Return COMPLETED", returnDone.status === "COMPLETED", {
    status: returnDone.status,
  });

  const orderAfter = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check("Order COMPLETED", orderAfter.status === "COMPLETED", {
    status: orderAfter.status,
  });

  log("3. Cleaning charge auto-generated?");
  const invoicesAuto = await listOrderInvoices(created.id, customer.id);
  check(
    "No cleaning charge auto-generated from dirty return",
    invoicesAuto.length === 0,
    { invoiceCount: invoicesAuto.length },
  );

  // No CLEANING_CHARGE line type — use MANUAL_CHARGE
  const invoice = (
    await apiOrThrow("POST", "/api/rental-invoices", {
      invoiceNumber: `INV-S11-${suffix}`,
      rentalOrderId: created.id,
      customerId: customer.id,
      invoiceDate: END_DATE,
      dueDate: "2026-08-17",
      notes: "Scenario 11 – rental + cleaning charge for muddy carpets",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: `Carpet rental × ${QTY}`,
          quantity: QTY,
          unitPrice: DAILY_RATE * RENTAL_DAYS,
          sortOrder: 0,
        },
        {
          lineType: "MANUAL_CHARGE",
          description: `Cleaning charge — muddy carpets × ${QTY}`,
          quantity: 1,
          unitPrice: CLEANING_CHARGE,
          sortOrder: 1,
        },
      ],
    })
  ).data;

  const cleaningLine = (invoice.items ?? []).find(
    (i) =>
      i.lineType === "MANUAL_CHARGE" &&
      String(i.description ?? "").toLowerCase().includes("cleaning"),
  );
  check(
    "Cleaning charge added manually as MANUAL_CHARGE (no CLEANING_CHARGE type)",
    cleaningLine != null && Number(cleaningLine.lineTotal) === CLEANING_CHARGE,
    {
      line: cleaningLine,
      availableLineTypes: [
        "RENTAL_CHARGE",
        "DELIVERY_CHARGE",
        "PICKUP_CHARGE",
        "DAMAGE_CHARGE",
        "LOST_ITEM_CHARGE",
        "REPAIR_CHARGE",
        "MANUAL_CHARGE",
        "DISCOUNT",
        "TAX",
      ],
    },
  );
  check(
    "Invoice total includes cleaning charge",
    Number(invoice.grandTotal) === RENTAL_TOTAL + CLEANING_CHARGE,
    {
      grandTotal: invoice.grandTotal,
      rental: RENTAL_TOTAL,
      cleaning: CLEANING_CHARGE,
    },
  );
  await apiOrThrow("POST", `/api/rental-invoices/${invoice.id}/issue`);

  log("4. Cleaning status via Maintenance (serviceType CLEANING)");
  const inv = await getInventory(product.id, warehouse.id);
  const maintenance = (
    await apiOrThrow("POST", "/api/maintenances", {
      maintenanceNumber: `MNT-S11-${suffix}`,
      productId: product.id,
      warehouseId: warehouse.id,
      inventoryId: inv.id,
      quantity: QTY,
      serviceType: "CLEANING",
      technician: "Cleaning Team",
      scheduledDate: END_DATE,
      estimatedCost: CLEANING_COST,
      notes: `Cleaning muddy carpets from rental order ${orderNumber}`,
    })
  ).data;

  check("Cleaning maintenance created as SCHEDULED", maintenance.status === "SCHEDULED", {
    status: maintenance.status,
    serviceType: maintenance.serviceType,
    quantity: maintenance.quantity,
  });

  const started = (
    await apiOrThrow("POST", `/api/maintenances/${maintenance.id}/start`)
  ).data;
  check("Cleaning status → IN_PROGRESS", started.status === "IN_PROGRESS", {
    status: started.status,
  });

  const completedMaint = (
    await apiOrThrow("POST", `/api/maintenances/${maintenance.id}/complete`)
  ).data;
  check("Cleaning status → COMPLETED", completedMaint.status === "COMPLETED", {
    status: completedMaint.status,
    serviceType: completedMaint.serviceType,
  });

  observe("Cleaning not linked automatically to return", {
    maintenanceNotes: completedMaint.notes,
    returnId: ret.id,
    linked: false,
    note: "Maintenance CLEANING is a separate workflow; return does not auto-create it",
  });

  const summary = {
    result: "PASS (behavior documented)",
    answers: {
      cleaningCharge:
        "Not auto. No CLEANING_CHARGE line type. Manual MANUAL_CHARGE works.",
      cleaningStatus:
        "Not on return. Available via Maintenance serviceType=CLEANING: SCHEDULED → IN_PROGRESS → COMPLETED.",
    },
    gaps: [
      "Return conditions are only GOOD / DAMAGED / LOST — no DIRTY",
      "Dirty state only in notes",
      "No auto cleaning charge or auto maintenance from dirty return",
    ],
    orderNumber,
    rentalOrderId: created.id,
    returnId: ret.id,
    invoiceId: invoice.id,
    maintenanceId: maintenance.id,
    cleaningCharge: {
      auto: false,
      manualLineType: "MANUAL_CHARGE",
      amount: CLEANING_CHARGE,
      invoiceGrandTotal: invoice.grandTotal,
    },
    cleaningStatus: {
      module: "maintenance",
      serviceType: "CLEANING",
      lifecycle: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      finalStatus: completedMaint.status,
    },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      return: `${BASE}/returns/${ret.id}`,
      invoice: `${BASE}/rental-invoices/${invoice.id}`,
      maintenance: `${BASE}/maintenances/${maintenance.id}`,
    },
  };

  console.log("\n========== SCENARIO 11 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 11 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
