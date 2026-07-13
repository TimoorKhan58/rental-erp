/**
 * Scenario 6 – Add Items After Delivery
 *
 * Delivery completed. Customer asks: "Please send 20 more chairs."
 * Check: Can items be added? New delivery note? Invoice updated?
 *
 * Usage: node --env-file=.env scripts/scenario-6-add-after-delivery.mjs
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

const QTY_INITIAL = 50;
const QTY_EXTRA = 20;
const DAILY_RATE = 50;
const START_DATE = "2026-07-30";
const END_DATE = "2026-07-31";

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 100,
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
        customerCode: `CUST-S6-${stamp()}`,
        name: "Scenario 6 Customer",
        phone: "+92 300 6667788",
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
        warehouseCode: `WH-S6-${stamp()}`,
        name: "Scenario 6 Warehouse",
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

  log("Scenario 6 – Add Items After Delivery", {
    initialQty: QTY_INITIAL,
    extraRequested: QTY_EXTRA,
  });

  await signIn();
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const product = await ensureProduct();
  await ensureStock(product.id, warehouse.id, PRODUCT.stock);

  log("1. Create, confirm, reserve, deliver initial 50 chairs");
  const orderNumber = `RO-S6-${suffix}`;
  const created = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 6 – initial delivery",
      items: [
        { productId: product.id, quantity: QTY_INITIAL, dailyRate: DAILY_RATE },
      ],
    })
  ).data;

  await apiOrThrow("POST", `/api/rental-orders/${created.id}/confirm`);
  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${created.id}/reserve`, {
      items: [{ productId: product.id, quantity: QTY_INITIAL }],
    })
  ).data;
  const orderItem = reserved.items?.[0];

  const firstDispatch = (
    await apiOrThrow("POST", "/api/dispatches", {
      dispatchNumber: `DSP-S6A-${suffix}`,
      rentalOrderId: created.id,
      dispatchDate: START_DATE,
      deliveryMethod: "DELIVERY",
      vehicleNumber: "LES-S6-001",
      driverName: "Scenario 6 Driver",
      driverPhone: "+92 301 6667777",
      deliveryAddress: customer.address ?? "Customer site",
      remarks: "Scenario 6 first delivery",
      items: [
        {
          productId: product.id,
          rentalOrderItemId: orderItem.id,
          quantity: QTY_INITIAL,
        },
      ],
    })
  ).data;
  await apiOrThrow("PATCH", `/api/dispatches/${firstDispatch.id}`, {
    markReady: true,
  });
  await apiOrThrow("POST", `/api/dispatches/${firstDispatch.id}/complete`);

  const afterDelivery = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check("Order is ON_RENT after delivery", afterDelivery.status === "ON_RENT", {
    status: afterDelivery.status,
    quantity: afterDelivery.items?.[0]?.quantity,
    reservedQuantity: afterDelivery.items?.[0]?.reservedQuantity,
  });

  const invAfterFirst = await getInventory(product.id, warehouse.id);
  observe("Inventory after first delivery", {
    quantityOnHand: invAfterFirst?.quantityOnHand,
    reservedQuantity: invAfterFirst?.reservedQuantity,
  });

  log('2. Can items be added? — PATCH order +20');
  const addViaUpdate = await api("PATCH", `/api/rental-orders/${created.id}`, {
    remarks: "Scenario 6 – try add 20 more chairs after delivery",
    items: [
      {
        productId: product.id,
        quantity: QTY_INITIAL + QTY_EXTRA,
        dailyRate: DAILY_RATE,
      },
    ],
  });
  check("Items CANNOT be added to order after delivery", addViaUpdate.ok === false, {
    httpStatus: addViaUpdate.status,
    error: addViaUpdate.json?.error,
  });

  const orderAfterAddAttempt = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check("Order qty remains 50", orderAfterAddAttempt.items?.[0]?.quantity === QTY_INITIAL, {
    quantity: orderAfterAddAttempt.items?.[0]?.quantity,
  });

  const reserveExtra = await api("POST", `/api/rental-orders/${created.id}/reserve`, {
    items: [{ productId: product.id, quantity: QTY_EXTRA }],
  });
  check("Extra reserve blocked on ON_RENT", reserveExtra.ok === false, {
    httpStatus: reserveExtra.status,
    error: reserveExtra.json?.error,
  });

  log("3. New delivery note generated? — create second dispatch for +20");
  const secondCreate = await api("POST", "/api/dispatches", {
    dispatchNumber: `DSP-S6B-${suffix}`,
    rentalOrderId: created.id,
    dispatchDate: START_DATE,
    deliveryMethod: "DELIVERY",
    vehicleNumber: "LES-S6-002",
    driverName: "Scenario 6 Driver",
    driverPhone: "+92 301 6667777",
    deliveryAddress: customer.address ?? "Customer site",
    remarks: "Scenario 6 second delivery attempt +20 chairs",
    items: [
      {
        productId: product.id,
        rentalOrderItemId: orderItem.id,
        quantity: QTY_EXTRA,
      },
    ],
  });

  observe("Second delivery note create response", {
    httpStatus: secondCreate.status,
    ok: secondCreate.ok,
    dispatchId: secondCreate.json?.data?.id,
    status: secondCreate.json?.data?.status,
    error: secondCreate.json?.error ?? null,
  });

  let secondDispatchCompleted = false;
  let secondDispatchId = null;
  let secondCompleteError = null;

  if (secondCreate.ok) {
    check(
      "Second delivery note WAS created (gap: no check vs already-dispatched qty)",
      true,
      {
        note: "Create only checks qty <= order line reservedQuantity (still 50), not remaining undelivered.",
      },
    );
    secondDispatchId = secondCreate.json.data.id;

    await apiOrThrow("PATCH", `/api/dispatches/${secondDispatchId}`, {
      markReady: true,
    });
    const completeRes = await api(
      "POST",
      `/api/dispatches/${secondDispatchId}/complete`,
    );
    secondDispatchCompleted = completeRes.ok;
    secondCompleteError = completeRes.json?.error ?? null;
    observe("Complete second delivery note", {
      httpStatus: completeRes.status,
      ok: completeRes.ok,
      status: completeRes.json?.data?.status,
      error: secondCompleteError,
    });

    if (!completeRes.ok) {
      check(
        "Second delivery cannot be completed (stock RELEASE has nothing left reserved)",
        true,
        { error: secondCompleteError },
      );
    } else {
      observe("Second delivery completed unexpectedly", {
        status: completeRes.json?.data?.status,
      });
    }
  } else {
    check("Second delivery note blocked at create", true, {
      error: secondCreate.json?.error,
    });
  }

  const dispatches = listItems(
    await apiOrThrow(
      "GET",
      `/api/dispatches?pageSize=100&rentalOrderId=${created.id}`,
    ),
  );
  observe("Delivery notes on order", {
    count: dispatches.length,
    notes: dispatches.map((d) => ({
      id: d.id,
      number: d.dispatchNumber,
      status: d.status,
      qty: d.items?.reduce((s, i) => s + i.quantity, 0),
    })),
  });

  log("4. Invoice updated?");
  const invoices = await listOrderInvoices(created.id, customer.id);
  check("No invoice exists while ON_RENT", invoices.length === 0, {
    invoiceCount: invoices.length,
  });

  const earlyInvoice = await api("POST", "/api/rental-invoices", {
    invoiceNumber: `INV-S6-EARLY-${suffix}`,
    rentalOrderId: created.id,
    customerId: customer.id,
    invoiceDate: END_DATE,
    notes: "Scenario 6 early invoice",
    items: [
      {
        lineType: "RENTAL_CHARGE",
        description: "Blocked",
        quantity: QTY_INITIAL + QTY_EXTRA,
        unitPrice: DAILY_RATE,
        sortOrder: 0,
      },
    ],
  });
  check("Invoice create/update blocked while ON_RENT", earlyInvoice.ok === false, {
    httpStatus: earlyInvoice.status,
    error: earlyInvoice.json?.error,
  });

  const finalOrder = (
    await apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;

  const summary = {
    result: "PASS (behavior documented)",
    answers: {
      canItemsBeAdded: false,
      newDeliveryNoteGenerated: secondCreate.ok === true,
      newDeliveryNoteCompletable: secondDispatchCompleted,
      invoiceUpdated: false,
    },
    verdict: {
      canItemsBeAdded:
        "No — order update blocked in ON_RENT; qty stays 50.",
      newDeliveryNoteGenerated: secondCreate.ok
        ? secondDispatchCompleted
          ? "Draft delivery note created AND completed (over-dispatch gap)."
          : "Draft delivery note can be created, but completing it fails (inventory reserved already released on first delivery)."
        : "No — second dispatch create blocked.",
      invoiceUpdated:
        "No — invoices only after COMPLETED; none exists; early create blocked.",
    },
    gap: secondCreate.ok
      ? "Dispatch create validates against order reservedQuantity only, not remaining undelivered qty — allows a second delivery note even when order lines were not increased."
      : null,
    orderNumber,
    rentalOrderId: created.id,
    orderStatus: finalOrder.status,
    orderQuantity: finalOrder.items?.[0]?.quantity,
    firstDispatchId: firstDispatch.id,
    secondDispatchId,
    attempts: {
      addItems: addViaUpdate.json?.error ?? null,
      reserveExtra: reserveExtra.json?.error ?? null,
      secondDispatchCreate: secondCreate.ok
        ? { created: true, id: secondDispatchId }
        : secondCreate.json?.error,
      secondDispatchComplete: secondCompleteError,
      earlyInvoice: earlyInvoice.json?.error ?? null,
    },
    checks,
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
      firstDispatch: `${BASE}/dispatches/${firstDispatch.id}`,
      secondDispatch: secondDispatchId
        ? `${BASE}/dispatches/${secondDispatchId}`
        : null,
    },
    workaround:
      "Create a separate new rental order for the extra 20 chairs (amend-after-delivery is not supported).",
  };

  console.log("\n========== SCENARIO 6 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 6 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
