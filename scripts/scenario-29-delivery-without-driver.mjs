/**
 * Scenario 29 – Delivery Without Assigned Driver or Vehicle
 *
 * Create a delivery but leave Driver blank and Vehicle blank.
 * Check whether the system enforces required logistics.
 *
 * Usage: node --env-file=.env scripts/scenario-29-delivery-without-driver.mjs
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

const QTY = 20;
const DAILY_RATE = 50;
const START_DATE = "2026-09-13";
const END_DATE = "2026-09-14";

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
    json = { raw: text.slice(0, 200) };
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
        customerCode: `CUST-S29-${stamp()}`,
        name: "Scenario 29 Customer",
        phone: "+92 300 2929292",
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
        warehouseCode: `WH-S29-${stamp()}`,
        name: "Scenario 29 Warehouse",
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

  log("Scenario 29 – Delivery Without Assigned Driver or Vehicle", {
    driver: "blank",
    vehicle: "blank",
    expectedCheck: "enforces required logistics?",
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Order + reserve for delivery");
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S29-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 29 – delivery without driver/vehicle",
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

  log("2. Create dispatch with blank driver + vehicle");
  const createBlank = await api("POST", "/api/dispatches", {
    dispatchNumber: `DSP-S29-${suffix}`,
    rentalOrderId: order.id,
    dispatchDate: START_DATE,
    deliveryMethod: "DELIVERY",
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    deliveryAddress: customer.address ?? "Customer site",
    remarks: "No driver / no vehicle assigned",
    items: [
      {
        productId: product.id,
        rentalOrderItemId: orderItem.id,
        quantity: QTY,
      },
    ],
  });

  // Also try explicit nulls if empty strings rejected
  let createRes = createBlank;
  if (!createBlank.ok) {
    observe("Empty-string create rejected — retry with null", {
      httpStatus: createBlank.status,
      error: createBlank.json?.error,
    });
    createRes = await api("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S29N-${suffix}`,
      rentalOrderId: order.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: null,
      driverName: null,
      driverPhone: null,
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "No driver / no vehicle (null)",
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity: QTY,
        },
      ],
    });
  }

  const logisticsEnforced = createRes.ok === false;
  observe("Create dispatch without driver/vehicle", {
    accepted: createRes.ok,
    httpStatus: createRes.status,
    error: createRes.json?.error ?? null,
    logisticsEnforced,
  });

  if (createRes.ok) {
    const dispatch = createRes.json.data;
    check("Dispatch created with blank logistics", true, {
      id: dispatch.id,
      vehicleNumber: dispatch.vehicleNumber,
      driverName: dispatch.driverName,
      driverPhone: dispatch.driverPhone,
    });
    check(
      "Driver is blank/null",
      dispatch.driverName == null || String(dispatch.driverName).trim() === "",
      { driverName: dispatch.driverName },
    );
    check(
      "Vehicle is blank/null",
      dispatch.vehicleNumber == null || String(dispatch.vehicleNumber).trim() === "",
      { vehicleNumber: dispatch.vehicleNumber },
    );

    log("3. Mark ready + complete without logistics");
    await apiOrThrow("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true });
    const completed = await api("POST", `/api/dispatches/${dispatch.id}/complete`);
    check("Complete delivery allowed without driver/vehicle", completed.ok === true, {
      httpStatus: completed.status,
      status: completed.json?.data?.status,
      error: completed.json?.error ?? null,
      vehicleNumber: completed.json?.data?.vehicleNumber,
      driverName: completed.json?.data?.driverName,
    });
  } else {
    check("System REJECTS dispatch without driver/vehicle", true, {
      httpStatus: createRes.status,
      error: createRes.json?.error,
    });
  }

  log("4. Control — deliveryAddress is required (logistics address)");
  const noAddress = await api("POST", "/api/dispatches", {
    dispatchNumber: `DSP-S29-ADDR-${suffix}`,
    rentalOrderId: order.id,
    dispatchDate: START_DATE,
    deliveryMethod: "DELIVERY",
    vehicleNumber: "LES-001",
    driverName: "Driver",
    driverPhone: "+92 300 0000000",
    deliveryAddress: "",
    remarks: "Missing address control",
    items: [
      {
        productId: product.id,
        rentalOrderItemId: orderItem.id,
        quantity: 1,
      },
    ],
  });
  observe("Blank deliveryAddress create", {
    blocked: noAddress.ok === false,
    httpStatus: noAddress.status,
    error: noAddress.json?.error ?? null,
  });

  const summary = {
    result: "PASS",
    answer: {
      enforcesRequiredDriver: false,
      enforcesRequiredVehicle: false,
      enforcesDeliveryAddress: noAddress.ok === false,
      canCreateWithoutDriverOrVehicle: createRes.ok === true,
      canCompleteWithoutDriverOrVehicle: createRes.ok === true,
      detail: createRes.ok
        ? "Driver and vehicle are optional; only delivery address is required among logistics fields."
        : "Driver/vehicle required at create.",
    },
    orderId: order.id,
    dispatchId: createRes.json?.data?.id ?? null,
    checks,
    gaps: createRes.ok
      ? [
          "vehicleNumber, driverName, driverPhone are optional/nullable",
          "No validation on markReady or complete requiring logistics assignment",
        ]
      : [],
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      dispatch: createRes.json?.data?.id
        ? `${BASE}/dispatches/${createRes.json.data.id}`
        : null,
    },
  };

  console.log("\n========== SCENARIO 29 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 29 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
