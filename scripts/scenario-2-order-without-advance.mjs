/**
 * Scenario 2 – Order Without Advance
 *
 * Customer confirms the order but pays nothing.
 * Test: Can delivery still happen? Is it blocked? Is there a warning?
 *
 * Usage: node --env-file=.env scripts/scenario-2-order-without-advance.mjs
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

const START_DATE = "2026-07-22";
const END_DATE = "2026-07-23";

const LINE_DEFS = [
  { key: "chair", productCode: "CHAIR-S1", name: "Chair", unit: "pcs", rentalRate: 50, quantity: 20, stock: 50 },
  { key: "table", productCode: "TABLE-S1", name: "Table", unit: "pcs", rentalRate: 200, quantity: 5, stock: 15 },
];

const cookieJar = new Map();

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
  return { ok: response.ok, status: response.status, json, headers: response.headers };
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

function hasPaymentWarning(payload) {
  if (!payload || typeof payload !== "object") return false;
  const data = payload.data ?? payload;
  if (data.warning != null || data.warnings != null || data.alerts != null) {
    return true;
  }
  if (payload.warning != null || payload.warnings != null) return true;
  const errorMsg = String(payload.error?.message ?? "").toLowerCase();
  return (
    errorMsg.includes("payment") ||
    errorMsg.includes("advance") ||
    errorMsg.includes("unpaid") ||
    errorMsg.includes("deposit")
  );
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
        customerCode: `CUST-S2-${stamp()}`,
        name: "Scenario 2 Customer (No Advance)",
        phone: "+92 300 2223344",
        address: "Lahore, Pakistan",
        notes: "Scenario 2 – Order Without Advance",
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
        warehouseCode: `WH-S2-${stamp()}`,
        name: "Scenario 2 Warehouse",
        address: "Main Yard",
        isActive: true,
      })
    ).data;
  }
  return warehouse;
}

async function ensureProduct(def) {
  const products = listItems(
    await apiOrThrow(
      "GET",
      `/api/products?pageSize=100&search=${encodeURIComponent(def.productCode)}`,
    ),
  );
  let product =
    products.find((p) => p.productCode === def.productCode) ??
    products.find((p) => p.name?.toLowerCase() === def.name.toLowerCase());
  if (!product) {
    product = (
      await apiOrThrow("POST", "/api/products", {
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
  const inventories = listItems(await apiOrThrow("GET", "/api/inventory?pageSize=100"));
  let row = inventories.find(
    (i) => i.productId === productId && i.warehouseId === warehouseId,
  );
  if (!row) {
    return (
      await apiOrThrow("POST", "/api/inventory", {
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
      await apiOrThrow("PATCH", `/api/inventory/${row.id}`, {
        quantityOnHand: Math.max(neededOnHand, row.quantityOnHand ?? 0, minQty),
      })
    ).data;
  }
  return row;
}

async function main() {
  const suffix = stamp();
  const findings = {
    deliveryAllowed: null,
    deliveryBlocked: null,
    warningPresent: false,
    warningSources: [],
    steps: [],
  };

  log("Scenario 2 – Order Without Advance", {
    question: "Can delivery happen with zero payment?",
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

  const orderNumber = `RO-S2-${suffix}`;
  log("1. Create & confirm order (no payment)", orderNumber);
  const order = (
    await apiOrThrow("POST", "/api/rental-orders", {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 2 – Order Without Advance (pays nothing)",
      items: LINE_DEFS.map((def) => ({
        productId: products[def.key].product.id,
        quantity: def.quantity,
        dailyRate: def.rentalRate,
      })),
    })
  ).data;

  const confirmed = (
    await apiOrThrow("POST", `/api/rental-orders/${order.id}/confirm`)
  ).data;
  findings.steps.push({ step: "confirm", status: confirmed.status });

  const reserved = (
    await apiOrThrow("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: LINE_DEFS.map((def) => ({
        productId: products[def.key].product.id,
        quantity: def.quantity,
      })),
    })
  ).data;
  findings.steps.push({ step: "reserve", status: reserved.status });

  for (const item of reserved.items ?? []) {
    const def = LINE_DEFS.find((d) => products[d.key].product.id === item.productId);
    if (def) products[def.key].orderItem = item;
  }

  log("2. Verify zero payments linked to this order");
  const paymentsList = listItems(
    await apiOrThrow("GET", `/api/payments?pageSize=100&customerId=${customer.id}`),
  );
  const orderPayments = paymentsList.filter(
    (p) =>
      p.rentalOrderId === order.id ||
      (p.notes ?? "").includes(orderNumber) ||
      (p.referenceNumber ?? "").includes(orderNumber),
  );
  // Also verify invoices for this order (should be none — invoice only after COMPLETED)
  let invoicesList = [];
  try {
    invoicesList = listItems(
      await apiOrThrow(
        "GET",
        `/api/rental-invoices?pageSize=100&rentalOrderId=${order.id}`,
      ),
    );
  } catch {
    invoicesList = listItems(
      await apiOrThrow(
        "GET",
        `/api/rental-invoices?pageSize=100&customerId=${customer.id}`,
      ),
    );
  }
  const orderInvoices = invoicesList.filter((inv) => inv.rentalOrderId === order.id);

  console.log({
    paymentsForOrder: orderPayments.length,
    invoicesForOrder: orderInvoices.length,
    orderStatus: reserved.status,
  });
  findings.steps.push({
    step: "verify_no_payment",
    paymentsForOrder: orderPayments.length,
    invoicesForOrder: orderInvoices.length,
  });

  if (orderPayments.length > 0 || orderInvoices.length > 0) {
    throw new Error("Scenario precondition failed: expected zero payments/invoices before delivery");
  }

  const dispatchNumber = `DSP-S2-${suffix}`;
  log("3. Attempt create dispatch with zero payment", dispatchNumber);
  const createRes = await api("POST", "/api/dispatches", {
    dispatchNumber,
    rentalOrderId: order.id,
    dispatchDate: START_DATE,
    deliveryMethod: "DELIVERY",
    vehicleNumber: "LES-S2-001",
    driverName: "Scenario 2 Driver",
    driverPhone: "+92 301 2223333",
    deliveryAddress: customer.address ?? "Customer site",
    remarks: "Scenario 2 – delivery with no advance payment",
    items: LINE_DEFS.map((def) => ({
      productId: products[def.key].product.id,
      rentalOrderItemId: products[def.key].orderItem.id,
      quantity: def.quantity,
    })),
  });

  console.log("Create dispatch response:", {
    httpStatus: createRes.status,
    ok: createRes.ok,
    dispatchStatus: createRes.json?.data?.status,
    error: createRes.json?.error ?? null,
    warningHintInBody: hasPaymentWarning(createRes.json),
  });

  if (hasPaymentWarning(createRes.json)) {
    findings.warningPresent = true;
    findings.warningSources.push("create_dispatch_response");
  }

  if (!createRes.ok) {
    findings.deliveryAllowed = false;
    findings.deliveryBlocked = true;
    findings.steps.push({
      step: "create_dispatch",
      blocked: true,
      httpStatus: createRes.status,
      error: createRes.json?.error,
    });
  } else {
    findings.deliveryBlocked = false;
    const dispatch = createRes.json.data;
    findings.steps.push({
      step: "create_dispatch",
      blocked: false,
      httpStatus: createRes.status,
      status: dispatch.status,
    });

    log("4. Mark READY");
    const readyRes = await api("PATCH", `/api/dispatches/${dispatch.id}`, {
      markReady: true,
    });
    console.log("Mark ready:", {
      httpStatus: readyRes.status,
      ok: readyRes.ok,
      status: readyRes.json?.data?.status,
      error: readyRes.json?.error ?? null,
      warningHintInBody: hasPaymentWarning(readyRes.json),
    });
    if (hasPaymentWarning(readyRes.json)) {
      findings.warningPresent = true;
      findings.warningSources.push("mark_ready_response");
    }
    if (!readyRes.ok) {
      findings.deliveryAllowed = false;
      findings.deliveryBlocked = true;
      findings.steps.push({
        step: "mark_ready",
        blocked: true,
        httpStatus: readyRes.status,
        error: readyRes.json?.error,
      });
    } else {
      findings.steps.push({
        step: "mark_ready",
        blocked: false,
        status: readyRes.json.data.status,
      });

      log("5. Complete dispatch (actual delivery)");
      const completeRes = await api(
        "POST",
        `/api/dispatches/${dispatch.id}/complete`,
      );
      console.log("Complete dispatch:", {
        httpStatus: completeRes.status,
        ok: completeRes.ok,
        status: completeRes.json?.data?.status,
        error: completeRes.json?.error ?? null,
        warningHintInBody: hasPaymentWarning(completeRes.json),
      });
      if (hasPaymentWarning(completeRes.json)) {
        findings.warningPresent = true;
        findings.warningSources.push("complete_dispatch_response");
      }

      if (!completeRes.ok) {
        findings.deliveryAllowed = false;
        findings.deliveryBlocked = true;
        findings.steps.push({
          step: "complete_dispatch",
          blocked: true,
          httpStatus: completeRes.status,
          error: completeRes.json?.error,
        });
      } else {
        findings.deliveryAllowed = true;
        findings.deliveryBlocked = false;
        findings.steps.push({
          step: "complete_dispatch",
          blocked: false,
          status: completeRes.json.data.status,
        });

        const orderAfter = (
          await apiOrThrow("GET", `/api/rental-orders/${order.id}`)
        ).data;
        findings.steps.push({
          step: "order_after_delivery",
          status: orderAfter.status,
        });
        findings.orderId = order.id;
        findings.orderNumber = orderNumber;
        findings.dispatchId = dispatch.id;
        findings.orderStatusAfterDelivery = orderAfter.status;
        findings.urls = {
          order: `${BASE}/rental-orders/${order.id}`,
          dispatch: `${BASE}/dispatches/${dispatch.id}`,
        };
      }
    }
  }

  // Code/UI scan notes (static — no payment gate in dispatch feature)
  findings.codeReview = {
    createDispatchChecksPayment: false,
    completeDispatchChecksPayment: false,
    dispatchUiShowsPaymentWarning: false,
    note: "Dispatch create/complete validate order status & stock only; no advance/payment gate. Order detail shows placeholder payment section only.",
  };

  console.log("\n========== SCENARIO 2 RESULT ==========");
  const answers = {
    canDeliveryStillHappen: findings.deliveryAllowed === true,
    doesSystemBlockIt: findings.deliveryBlocked === true,
    isThereAWarning: findings.warningPresent === true,
  };
  console.log(
    JSON.stringify(
      {
        result:
          findings.deliveryAllowed === true &&
          findings.deliveryBlocked === false &&
          findings.warningPresent === false
            ? "PASS (delivery allowed; no block; no warning)"
            : findings.deliveryBlocked
              ? "BLOCKED"
              : "OBSERVED",
        answers,
        findings,
      },
      null,
      2,
    ),
  );

  if (findings.deliveryAllowed !== true) process.exit(1);
}

main().catch((error) => {
  console.error("\nSCENARIO 2 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
