/**
 * Scenario 22 – Inventory Under Maintenance
 *
 * 20 Chairs marked "Under Repair" (maintenance IN_PROGRESS).
 * Customer orders 100 Chairs.
 * Warehouse physically has 100, but only 80 should be available.
 * Check: system excludes maintenance inventory.
 *
 * Usage: node --env-file=.env scripts/scenario-22-inventory-under-maintenance.mjs
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

const PHYSICAL_ON_HAND = 100;
const UNDER_REPAIR = 20;
const EXPECTED_AVAILABLE = 80;
const ORDER_QTY = 100;
const DAILY_RATE = 50;
const START_DATE = "2026-09-01";
const END_DATE = "2026-09-02";

const PRODUCT = {
  productCode: "CHAIR-S22",
  name: "Chair S22",
  unit: "pcs",
  rentalRate: DAILY_RATE,
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

function availableOf(row) {
  if (row == null) return 0;
  if (row.availableQuantity != null) return Number(row.availableQuantity);
  return Number(row.quantityOnHand ?? 0) - Number(row.reservedQuantity ?? 0);
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
        customerCode: `CUST-S22-${stamp()}`,
        name: "Scenario 22 Customer",
        phone: "+92 300 2222222",
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
        warehouseCode: `WH-S22-${stamp()}`,
        name: "Scenario 22 Warehouse",
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
    products.find((p) => p.productCode === PRODUCT.productCode) ?? null;
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

async function getInventory(productId, warehouseId) {
  const inventories = listItems(await apiOrThrow("GET", "/api/inventory?pageSize=100"));
  return (
    inventories.find(
      (i) => i.productId === productId && i.warehouseId === warehouseId,
    ) ?? null
  );
}

async function setOnHand(productId, warehouseId, onHand) {
  let row = await getInventory(productId, warehouseId);
  if (!row) {
    return (
      await apiOrThrow("POST", "/api/inventory", {
        productId,
        warehouseId,
        quantityOnHand: onHand,
        reservedQuantity: 0,
        minimumStock: 0,
        maximumStock: Math.max(onHand * 2, 200),
        isActive: true,
      })
    ).data;
  }
  // Clear any leftover reservation from prior runs by setting reserved to 0 when possible
  row = (
    await apiOrThrow("PATCH", `/api/inventory/${row.id}`, {
      quantityOnHand: onHand,
      reservedQuantity: 0,
    })
  ).data;
  return row;
}

async function main() {
  const suffix = stamp();

  log("Scenario 22 – Inventory Under Maintenance", {
    physicalOnHand: PHYSICAL_ON_HAND,
    underRepair: UNDER_REPAIR,
    expectedAvailable: EXPECTED_AVAILABLE,
    orderQty: ORDER_QTY,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();

  log("1. Set warehouse stock to 100 chairs (dedicated product)");
  let inv = await setOnHand(product.id, warehouse.id, PHYSICAL_ON_HAND);
  check("On-hand = 100 before maintenance", Number(inv.quantityOnHand) === PHYSICAL_ON_HAND, {
    quantityOnHand: inv.quantityOnHand,
    reservedQuantity: inv.reservedQuantity,
    availableQuantity: availableOf(inv),
  });
  check("Available = 100 before maintenance", availableOf(inv) === PHYSICAL_ON_HAND, {
    available: availableOf(inv),
  });

  log("2. Mark 20 chairs Under Repair (maintenance → start)");
  const maintenance = (
    await apiOrThrow("POST", "/api/maintenances", {
      maintenanceNumber: `MNT-S22-${suffix}`,
      productId: product.id,
      warehouseId: warehouse.id,
      inventoryId: inv.id,
      quantity: UNDER_REPAIR,
      serviceType: "OTHER",
      technician: "Repair Bay",
      scheduledDate: START_DATE,
      estimatedCost: 5000,
      notes: "Under Repair – Scenario 22",
    })
  ).data;
  check("Maintenance created SCHEDULED", maintenance.status === "SCHEDULED", {
    status: maintenance.status,
    quantity: maintenance.quantity,
  });

  inv = (await apiOrThrow("GET", `/api/inventory/${inv.id}`)).data;
  observe("SCHEDULED alone does not remove stock yet", {
    quantityOnHand: inv.quantityOnHand,
    availableQuantity: availableOf(inv),
    note: "Only start (IN_PROGRESS) posts OUT",
  });

  const started = (
    await apiOrThrow("POST", `/api/maintenances/${maintenance.id}/start`)
  ).data;
  check("Maintenance IN_PROGRESS (Under Repair)", started.status === "IN_PROGRESS", {
    status: started.status,
    quantity: started.quantity,
  });

  inv = (await apiOrThrow("GET", `/api/inventory/${inv.id}`)).data;
  check(
    "Available after under-repair = 80",
    availableOf(inv) === EXPECTED_AVAILABLE,
    {
      quantityOnHand: inv.quantityOnHand,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: availableOf(inv),
      expected: EXPECTED_AVAILABLE,
    },
  );
  observe("How maintenance excludes stock", {
    mechanism: "Start maintenance posts OUT movement (reduces quantityOnHand)",
    quantityOnHandNow: inv.quantityOnHand,
    physicalStillInWarehouse: PHYSICAL_ON_HAND,
    systemShowsOnHand: Number(inv.quantityOnHand),
    separateUnderRepairBucket: false,
  });

  log("3. Customer orders 100 chairs — create + confirm");
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S22-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 22 – order 100 while 20 under repair",
      items: [
        { productId: product.id, quantity: ORDER_QTY, dailyRate: DAILY_RATE },
      ],
    })
  ).data;
  await apiOrThrow("POST", `/api/rental-orders/${order.id}/confirm`);
  observe("Order create/confirm allowed for 100 (availability checked at reserve)", {
    orderId: order.id,
    status: "CONFIRMED",
    quantity: ORDER_QTY,
  });

  log("4. Attempt reserve of 100 (should fail — only 80 available)");
  const reserve100 = await api("POST", `/api/rental-orders/${order.id}/reserve`, {
    items: [{ productId: product.id, quantity: ORDER_QTY }],
  });

  check("Reserve of 100 REJECTED", reserve100.ok === false, {
    httpStatus: reserve100.status,
    error: reserve100.json?.error,
  });

  const msg = String(reserve100.json?.error?.message ?? "");
  check(
    "Error cites insufficient available quantity",
    msg.toLowerCase().includes("insufficient") ||
      msg.toLowerCase().includes("available"),
    { message: msg },
  );

  log("5. Control — reserve of 80 should succeed");
  const reserve80 = await api("POST", `/api/rental-orders/${order.id}/reserve`, {
    items: [{ productId: product.id, quantity: EXPECTED_AVAILABLE }],
  });
  check("Reserve of 80 ACCEPTED", reserve80.ok === true, {
    httpStatus: reserve80.status,
    status: reserve80.json?.data?.status,
    reservedQuantity: reserve80.json?.data?.items?.[0]?.reservedQuantity,
    error: reserve80.json?.error ?? null,
  });

  const excludesMaintenance =
    reserve100.ok === false && availableOf(inv) === EXPECTED_AVAILABLE;

  const summary = {
    result: excludesMaintenance ? "PASS" : "FAIL",
    answer: {
      excludesMaintenanceInventory: excludesMaintenance,
      how: "Starting maintenance (IN_PROGRESS) posts stock OUT — availableQuantity drops. Reserve then uses available = onHand − reserved.",
      underRepairNativeStatus: false,
      underRepairMappedAs: "Maintenance serviceType=OTHER, status=IN_PROGRESS",
      scheduledAloneExcludes: false,
      orderCreateChecksAvailability: false,
      reserveChecksAvailability: true,
    },
    inventoryAfterMaintenance: {
      quantityOnHand: inv.quantityOnHand,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: availableOf(inv),
    },
    orderId: order.id,
    maintenanceId: maintenance.id,
    checks,
    notes: [
      "No separate 'Under Repair' inventory bucket — on-hand is reduced by OUT.",
      "Physically 100 may still sit in the warehouse; system shows on-hand 80 while repair is in progress.",
    ],
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      maintenance: `${BASE}/maintenances/${maintenance.id}`,
      inventory: `${BASE}/inventory/${inv.id}`,
    },
  };

  console.log("\n========== SCENARIO 22 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));

  if (summary.result !== "PASS") process.exit(1);
}

main().catch((error) => {
  console.error("\nSCENARIO 22 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
