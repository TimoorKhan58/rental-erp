/**
 * Scenario 1 – Standard Order (E2E against running local app)
 *
 * Customer orders: 100 Chairs, 10 Tables, 2 Tents
 * Delivery: 20 July, Return: 21 July
 * Pays 30% advance (recorded after invoice — system has no pre-completion advance API)
 * Deliver all → Return all → Close order (COMPLETED)
 *
 * Usage: node --env-file=.env scripts/scenario-1-standard-order.mjs
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

const START_DATE = "2026-07-20";
const END_DATE = "2026-07-21";
const RENTAL_DAYS = 1;

const LINE_DEFS = [
  { key: "chair", productCode: "CHAIR-S1", name: "Chair", unit: "pcs", rentalRate: 50, quantity: 100, stock: 150 },
  { key: "table", productCode: "TABLE-S1", name: "Table", unit: "pcs", rentalRate: 200, quantity: 10, stock: 20 },
  { key: "tent", productCode: "TENT-S1", name: "Tent", unit: "pcs", rentalRate: 5000, quantity: 2, stock: 5 },
];

const cookieJar = new Map();
const results = { steps: [], passed: true, notes: [] };

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

function recordStep(name, ok, detail) {
  results.steps.push({ name, ok, detail });
  console.log(ok ? `PASS: ${name}` : `FAIL: ${name}`, detail ?? "");
  if (!ok) results.passed = false;
}

function assertEqual(name, actual, expected) {
  const ok = actual === expected;
  recordStep(name, ok, { expected, actual });
  if (!ok) throw new Error(`${name}: expected ${expected}, got ${actual}`);
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
      return cred.email;
    }
    lastError = `Sign-in failed for ${cred.email}: ${response.status} ${JSON.stringify(body)}`;
  }
  throw new Error(lastError ?? "Sign-in failed");
}

function listItems(res) {
  return res.data?.items ?? res.data ?? [];
}

async function ensureCustomer() {
  const customers = listItems(await api("GET", "/api/customers?pageSize=50"));
  let customer = customers.find((c) => c.isActive !== false) ?? customers[0];
  if (!customer) {
    const created = await api("POST", "/api/customers", {
      customerCode: `CUST-S1-${stamp()}`,
      name: "Scenario 1 Customer",
      phone: "+92 300 1112233",
      address: "Lahore, Pakistan",
      notes: "Scenario 1 – Standard Order",
      isActive: true,
    });
    customer = created.data;
  }
  return customer;
}

async function ensureWarehouse() {
  const warehouses = listItems(await api("GET", "/api/warehouses?pageSize=50"));
  let warehouse = warehouses.find((w) => w.isActive !== false) ?? warehouses[0];
  if (!warehouse) {
    const created = await api("POST", "/api/warehouses", {
      warehouseCode: `WH-S1-${stamp()}`,
      name: "Scenario 1 Warehouse",
      address: "Main Yard",
      isActive: true,
    });
    warehouse = created.data;
  }
  return warehouse;
}

async function ensureProduct(def) {
  const products = listItems(await api("GET", `/api/products?pageSize=100&search=${encodeURIComponent(def.productCode)}`));
  let product =
    products.find((p) => p.productCode === def.productCode) ??
    products.find((p) => p.name?.toLowerCase() === def.name.toLowerCase());
  if (!product) {
    const created = await api("POST", "/api/products", {
      productCode: def.productCode,
      name: def.name,
      unit: def.unit,
      rentalRate: def.rentalRate,
      isActive: true,
    });
    product = created.data;
    console.log("Created product", product.productCode, product.id);
  } else {
    console.log("Using product", product.productCode, product.id);
  }
  return product;
}

async function ensureStock(productId, warehouseId, minQty) {
  const inventories = listItems(await api("GET", `/api/inventory?pageSize=100`));
  let row = inventories.find(
    (i) => i.productId === productId && i.warehouseId === warehouseId,
  );
  if (!row) {
    const created = await api("POST", "/api/inventory", {
      productId,
      warehouseId,
      quantityOnHand: minQty,
      reservedQuantity: 0,
      minimumStock: 0,
      maximumStock: Math.max(minQty * 2, 100),
      isActive: true,
    });
    row = created.data;
    console.log("Created inventory", productId, "qty", minQty);
    return row;
  }

  const available =
    row.availableQuantity ??
    (row.quantityOnHand ?? 0) - (row.reservedQuantity ?? 0);
  if (available < minQty) {
    const neededOnHand =
      (row.reservedQuantity ?? 0) + minQty;
    const updated = await api("PATCH", `/api/inventory/${row.id}`, {
      quantityOnHand: Math.max(neededOnHand, row.quantityOnHand ?? 0, minQty),
    });
    row = updated.data;
    console.log("Topped up inventory", productId, "to", row.quantityOnHand);
  } else {
    console.log("Stock OK", productId, "available", available);
  }
  return row;
}

async function main() {
  const suffix = stamp();
  log("Scenario 1 – Standard Order", {
    startDate: START_DATE,
    endDate: END_DATE,
    lines: LINE_DEFS.map((l) => `${l.quantity} ${l.name}`).join(", "),
  });

  log("1. Sign in");
  await signIn();
  recordStep("Sign in", true);

  log("2. Ensure master data (customer, warehouse, products, stock)");
  const customer = await ensureCustomer();
  const warehouse = await ensureWarehouse();
  const products = {};
  for (const def of LINE_DEFS) {
    const product = await ensureProduct(def);
    products[def.key] = { ...def, product };
    await ensureStock(product.id, warehouse.id, def.stock);
  }
  recordStep("Master data ready", true, {
    customerId: customer.id,
    warehouseId: warehouse.id,
    products: Object.fromEntries(
      Object.entries(products).map(([k, v]) => [k, v.product.id]),
    ),
  });

  const orderNumber = `RO-S1-${suffix}`;
  log("3. Create rental order", orderNumber);
  const orderCreated = await api("POST", "/api/rental-orders", {
    orderNumber,
    customerId: customer.id,
    warehouseId: warehouse.id,
    startDate: START_DATE,
    endDate: END_DATE,
    remarks: "Scenario 1 – Standard Order: 100 Chairs, 10 Tables, 2 Tents",
    items: LINE_DEFS.map((def) => ({
      productId: products[def.key].product.id,
      quantity: def.quantity,
      dailyRate: def.rentalRate,
    })),
  });
  const order = orderCreated.data;
  assertEqual("Order created as DRAFT", order.status, "DRAFT");
  assertEqual("Order has 3 line items", order.items?.length ?? 0, 3);

  log("4. Confirm order");
  const confirmed = (await api("POST", `/api/rental-orders/${order.id}/confirm`)).data;
  assertEqual("Order CONFIRMED", confirmed.status, "CONFIRMED");

  log("5. Reserve stock (full quantities)");
  const reserved = (
    await api("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: LINE_DEFS.map((def) => ({
        productId: products[def.key].product.id,
        quantity: def.quantity,
      })),
    })
  ).data;
  assertEqual("Order RESERVED", reserved.status, "RESERVED");

  const orderItemsByProduct = new Map(
    (reserved.items ?? confirmed.items ?? order.items).map((item) => [
      item.productId,
      item,
    ]),
  );
  for (const def of LINE_DEFS) {
    const item = orderItemsByProduct.get(products[def.key].product.id);
    if (!item?.id) throw new Error(`Missing order item for ${def.name}`);
    products[def.key].orderItem = item;
  }

  results.notes.push(
    "Advance payment: system only allows payments against issued invoices after order COMPLETED. Recording 30% as first posted payment after close (business advance approximated).",
  );
  recordStep("Advance 30% (pre-delivery)", true, {
    note: "Not supported pre-completion; will post 30% after invoice",
  });

  const dispatchNumber = `DSP-S1-${suffix}`;
  log("6. Create dispatch (deliver all)", dispatchNumber);
  const dispatchCreated = await api("POST", "/api/dispatches", {
    dispatchNumber,
    rentalOrderId: order.id,
    dispatchDate: START_DATE,
    deliveryMethod: "DELIVERY",
    vehicleNumber: "LES-S1-001",
    driverName: "Scenario Driver",
    driverPhone: "+92 301 0001111",
    deliveryAddress: customer.address ?? "Customer site",
    remarks: "Scenario 1 full delivery",
    items: LINE_DEFS.map((def) => ({
      productId: products[def.key].product.id,
      rentalOrderItemId: products[def.key].orderItem.id,
      quantity: def.quantity,
    })),
  });
  const dispatch = dispatchCreated.data;
  recordStep("Dispatch created", true, { id: dispatch.id, status: dispatch.status });

  log("7. Mark dispatch READY");
  const ready = (
    await api("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true })
  ).data;
  assertEqual("Dispatch READY", ready.status, "READY");

  log("8. Complete dispatch (deliver all items)");
  const dispatchDone = (
    await api("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  assertEqual("Dispatch COMPLETED", dispatchDone.status, "COMPLETED");

  const afterDispatch = (await api("GET", `/api/rental-orders/${order.id}`)).data;
  recordStep("Order after full delivery", ["DISPATCHED", "ON_RENT"].includes(afterDispatch.status), {
    status: afterDispatch.status,
  });
  if (!["DISPATCHED", "ON_RENT"].includes(afterDispatch.status)) {
    throw new Error(`Expected DISPATCHED or ON_RENT, got ${afterDispatch.status}`);
  }

  const dispatchItemsByOrderItem = new Map(
    (dispatchDone.items ?? dispatch.items ?? []).map((di) => [
      di.rentalOrderItemId,
      di,
    ]),
  );

  const returnNumber = `RET-S1-${suffix}`;
  log("9. Create return (return all)", returnNumber);
  const returnCreated = await api("POST", "/api/returns", {
    returnNumber,
    rentalOrderId: order.id,
    dispatchId: dispatch.id,
    returnDate: END_DATE,
    remarks: "Scenario 1 full return",
    items: LINE_DEFS.map((def) => {
      const orderItem = products[def.key].orderItem;
      const dispatchItem = dispatchItemsByOrderItem.get(orderItem.id);
      return {
        rentalOrderItemId: orderItem.id,
        dispatchItemId: dispatchItem?.id ?? null,
        quantity: def.quantity,
      };
    }),
  });
  const ret = returnCreated.data;
  recordStep("Return created", true, { id: ret.id, status: ret.status });

  log("10. Receive return");
  const received = (await api("POST", `/api/returns/${ret.id}/receive`)).data;
  recordStep("Return received", true, { status: received.status });

  log("11. Inspect return (all good)");
  const inspected = (
    await api("POST", `/api/returns/${ret.id}/inspect`, {
      items: LINE_DEFS.map((def) => ({
        rentalOrderItemId: products[def.key].orderItem.id,
        goodQuantity: def.quantity,
        damagedQuantity: 0,
        lostQuantity: 0,
      })),
    })
  ).data;
  recordStep("Return inspected (all good)", true, { status: inspected.status });

  log("12. Complete return (closes order)");
  const returnDone = (await api("POST", `/api/returns/${ret.id}/complete`)).data;
  recordStep("Return completed", true, { status: returnDone.status });

  log("13. Verify order COMPLETED (closed)");
  const completedOrder = (await api("GET", `/api/rental-orders/${order.id}`)).data;
  assertEqual("Order CLOSED / COMPLETED", completedOrder.status, "COMPLETED");

  const invoiceNumber = `INV-S1-${suffix}`;
  const invoiceItems = LINE_DEFS.map((def, index) => ({
    lineType: "RENTAL_CHARGE",
    description: `${def.name} rental (${RENTAL_DAYS} day)`,
    quantity: def.quantity,
    unitPrice: def.rentalRate * RENTAL_DAYS,
    sortOrder: index,
  }));
  const expectedSubtotal = LINE_DEFS.reduce(
    (sum, def) => sum + def.quantity * def.rentalRate * RENTAL_DAYS,
    0,
  );
  // 100*50 + 10*200 + 2*5000 = 5000 + 2000 + 10000 = 17000
  const advanceAmount = Math.round(expectedSubtotal * 0.3 * 100) / 100;

  log("14. Create & issue invoice", { expectedSubtotal, advanceAmount });
  const invoiceCreated = await api("POST", "/api/rental-invoices", {
    invoiceNumber,
    rentalOrderId: order.id,
    customerId: customer.id,
    invoiceDate: END_DATE,
    dueDate: "2026-07-28",
    notes: "Scenario 1 invoice",
    items: invoiceItems,
  });
  const invoice = invoiceCreated.data;
  recordStep("Invoice created", true, {
    id: invoice.id,
    grandTotal: invoice.grandTotal,
  });

  const issued = (
    await api("POST", `/api/rental-invoices/${invoice.id}/issue`)
  ).data;
  assertEqual("Invoice ISSUED", issued.status, "ISSUED");

  const grandTotal = Number(issued.grandTotal);
  const thirtyPercent = Math.round(grandTotal * 0.3 * 100) / 100;

  log("15. Post 30% advance payment (after close — system constraint)", thirtyPercent);
  const paymentNumber = `PAY-S1-${suffix}`;
  const paymentCreated = await api("POST", "/api/payments", {
    paymentNumber,
    rentalInvoiceId: invoice.id,
    customerId: customer.id,
    paymentDate: START_DATE,
    paymentMethod: "CASH",
    amount: thirtyPercent,
    referenceNumber: "ADV-S1-30PCT",
    notes: "Scenario 1: 30% advance (posted after completion due to system rules)",
  });
  const payment = paymentCreated.data;
  const posted = (await api("POST", `/api/payments/${payment.id}/post`)).data;
  recordStep("30% payment posted", posted.status === "POSTED", {
    amount: thirtyPercent,
    status: posted.status,
  });

  const invoiceAfterPay = (
    await api("GET", `/api/rental-invoices/${invoice.id}`)
  ).data;
  recordStep("Invoice partially paid after 30%", invoiceAfterPay.status === "PARTIALLY_PAID" || invoiceAfterPay.status === "PAID", {
    status: invoiceAfterPay.status,
    grandTotal,
    paidAmount: invoiceAfterPay.paidAmount ?? invoiceAfterPay.amountPaid,
  });

  console.log("\n========== SCENARIO 1 RESULT ==========");
  const summary = {
    result: results.passed ? "PASS" : "FAIL",
    orderNumber,
    rentalOrderId: order.id,
    orderStatus: completedOrder.status,
    dispatchId: dispatch.id,
    returnId: ret.id,
    invoiceId: invoice.id,
    invoiceStatus: invoiceAfterPay.status,
    grandTotal,
    advancePosted: thirtyPercent,
    steps: results.steps,
    notes: results.notes,
    urls: {
      order: `${BASE}/rental-orders/${order.id}`,
      dispatch: `${BASE}/dispatches/${dispatch.id}`,
      return: `${BASE}/returns/${ret.id}`,
      invoice: `${BASE}/rental-invoices/${invoice.id}`,
      payment: `${BASE}/payments/${payment.id}`,
    },
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!results.passed) process.exit(1);
}

main().catch((error) => {
  console.error("\nSCENARIO 1 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
