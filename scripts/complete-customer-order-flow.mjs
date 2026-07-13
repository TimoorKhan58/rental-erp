/**
 * End-to-end customer rental order flow against a running local app.
 * Usage: node --env-file=.env scripts/complete-customer-order-flow.mjs
 */
import { config } from "dotenv";

config();

const BASE = process.env.FLOW_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.FLOW_EMAIL ?? "admin@local.dev";
const PASSWORD = process.env.FLOW_PASSWORD ?? "LocalAdmin123!";

const cookieJar = new Map();

function storeCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) {
      cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
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
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
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

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function log(step, detail) {
  console.log(`\n=== ${step} ===`);
  if (detail !== undefined) console.log(detail);
}

async function main() {
  log("1. Sign in", EMAIL);
  const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: BASE,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  storeCookies(signIn);
  const signInBody = await signIn.json().catch(() => ({}));
  if (!signIn.ok) {
    throw new Error(`Sign-in failed: ${signIn.status} ${JSON.stringify(signInBody)}`);
  }
  console.log("Signed in as", signInBody.user?.email ?? EMAIL);

  log("2. Load master data");
  const [customersRes, productsRes, warehousesRes, inventoryRes] =
    await Promise.all([
      api("GET", "/api/customers?pageSize=50"),
      api("GET", "/api/products?pageSize=50"),
      api("GET", "/api/warehouses?pageSize=50"),
      api("GET", "/api/inventory?pageSize=100"),
    ]);

  const customers = customersRes.data?.items ?? customersRes.data ?? [];
  const products = productsRes.data?.items ?? productsRes.data ?? [];
  const warehouses = warehousesRes.data?.items ?? warehousesRes.data ?? [];
  const inventories = inventoryRes.data?.items ?? inventoryRes.data ?? [];

  console.log({
    customers: customers.length,
    products: products.length,
    warehouses: warehouses.length,
    inventories: inventories.length,
  });

  let customer = customers.find((c) => c.isActive !== false) ?? customers[0];
  if (!customer) {
    const code = `CUST-FLOW-${stamp()}`;
    const created = await api("POST", "/api/customers", {
      customerCode: code,
      name: "Flow Test Customer",
      phone: "+92 300 1234567",
      address: "Lahore, Pakistan",
      notes: "Created by complete-customer-order-flow script",
      isActive: true,
    });
    customer = created.data;
    console.log("Created customer", customer.id, customer.customerCode);
  } else {
    console.log("Using customer", customer.id, customer.name);
  }

  const stocked = inventories
    .map((row) => ({
      ...row,
      available:
        row.availableQuantity ??
        (row.quantityOnHand ?? 0) - (row.reservedQuantity ?? 0),
    }))
    .filter((row) => row.available >= 1 && row.productId && row.warehouseId)
    .sort((a, b) => b.available - a.available);

  if (stocked.length === 0) {
    throw new Error(
      "No inventory with available quantity. Seed stock before running this flow.",
    );
  }

  const inventory = stocked[0];
  const product =
    products.find((p) => p.id === inventory.productId) ??
    (await api("GET", `/api/products/${inventory.productId}`)).data;
  const warehouse =
    warehouses.find((w) => w.id === inventory.warehouseId) ??
    (await api("GET", `/api/warehouses/${inventory.warehouseId}`)).data;

  const qty = 1;
  const dailyRate = Number(product.rentalRate ?? product.dailyRate ?? 500);

  console.log({
    productId: product.id,
    productName: product.name,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    available: inventory.available,
    dailyRate,
  });

  const suffix = stamp();
  const orderNumber = `RO-FLOW-${suffix}`;
  const startDate = isoDate(0);
  const endDate = isoDate(2);

  log("3. Create rental order", orderNumber);
  const orderCreated = await api("POST", "/api/rental-orders", {
    orderNumber,
    customerId: customer.id,
    warehouseId: warehouse.id,
    startDate,
    endDate,
    remarks: "E2E complete customer order flow",
    items: [{ productId: product.id, quantity: qty, dailyRate }],
  });
  const order = orderCreated.data;
  console.log({ id: order.id, status: order.status, orderNumber: order.orderNumber });

  log("4. Confirm rental order");
  const confirmed = (await api("POST", `/api/rental-orders/${order.id}/confirm`))
    .data;
  console.log({ status: confirmed.status });

  log("5. Reserve stock");
  const reserved = (
    await api("POST", `/api/rental-orders/${order.id}/reserve`, {
      items: [{ productId: product.id, quantity: qty }],
    })
  ).data;
  console.log({ status: reserved.status });

  const orderItem =
    reserved.items?.[0] ?? confirmed.items?.[0] ?? order.items?.[0];
  if (!orderItem?.id) {
    throw new Error("Rental order item id missing after reserve");
  }

  const dispatchNumber = `DSP-FLOW-${suffix}`;
  log("6. Create dispatch", dispatchNumber);
  const dispatchCreated = await api("POST", "/api/dispatches", {
    dispatchNumber,
    rentalOrderId: order.id,
    dispatchDate: startDate,
    deliveryMethod: "DELIVERY",
    vehicleNumber: "LES-1234",
    driverName: "Flow Driver",
    driverPhone: "+92 301 7654321",
    deliveryAddress: customer.address ?? "Customer site",
    remarks: "E2E dispatch",
    items: [
      {
        productId: product.id,
        rentalOrderItemId: orderItem.id,
        quantity: qty,
      },
    ],
  });
  const dispatch = dispatchCreated.data;
  console.log({ id: dispatch.id, status: dispatch.status });

  log("7. Mark dispatch READY");
  const ready = (
    await api("PATCH", `/api/dispatches/${dispatch.id}`, { markReady: true })
  ).data;
  console.log({ status: ready.status });

  log("8. Complete dispatch (DISPATCHED → COMPLETED)");
  const dispatchDone = (
    await api("POST", `/api/dispatches/${dispatch.id}/complete`)
  ).data;
  console.log({ status: dispatchDone.status });

  const dispatchItem = dispatchDone.items?.[0] ?? dispatch.items?.[0];

  const returnNumber = `RET-FLOW-${suffix}`;
  log("9. Create return", returnNumber);
  const returnCreated = await api("POST", "/api/returns", {
    returnNumber,
    rentalOrderId: order.id,
    dispatchId: dispatch.id,
    returnDate: endDate,
    remarks: "E2E return",
    items: [
      {
        rentalOrderItemId: orderItem.id,
        dispatchItemId: dispatchItem?.id ?? null,
        quantity: qty,
      },
    ],
  });
  const ret = returnCreated.data;
  console.log({ id: ret.id, status: ret.status });

  log("10. Receive return");
  const received = (await api("POST", `/api/returns/${ret.id}/receive`)).data;
  console.log({ status: received.status });

  log("11. Inspect return (all good)");
  const inspected = (
    await api("POST", `/api/returns/${ret.id}/inspect`, {
      items: [
        {
          rentalOrderItemId: orderItem.id,
          goodQuantity: qty,
          damagedQuantity: 0,
          lostQuantity: 0,
        },
      ],
    })
  ).data;
  console.log({ status: inspected.status });

  log("12. Complete return");
  const returnDone = (await api("POST", `/api/returns/${ret.id}/complete`))
    .data;
  console.log({ status: returnDone.status });

  log("13. Verify rental order COMPLETED");
  const completedOrder = (await api("GET", `/api/rental-orders/${order.id}`))
    .data;
  console.log({ id: completedOrder.id, status: completedOrder.status });
  if (completedOrder.status !== "COMPLETED") {
    throw new Error(
      `Expected rental order COMPLETED after full return, got ${completedOrder.status}`,
    );
  }

  const invoiceNumber = `INV-FLOW-${suffix}`;
  const rentalDays = 2;
  const unitPrice = dailyRate * rentalDays;

  log("14. Create rental invoice", invoiceNumber);
  const invoiceCreated = await api("POST", "/api/rental-invoices", {
    invoiceNumber,
    rentalOrderId: order.id,
    customerId: customer.id,
    invoiceDate: endDate,
    dueDate: isoDate(9),
    notes: "E2E rental invoice",
    items: [
      {
        lineType: "RENTAL_CHARGE",
        description: `${product.name} rental (${rentalDays} days)`,
        quantity: qty,
        unitPrice,
        sortOrder: 0,
      },
    ],
  });
  const invoice = invoiceCreated.data;
  console.log({
    id: invoice.id,
    status: invoice.status,
    grandTotal: invoice.grandTotal,
  });

  log("15. Issue invoice");
  const issued = (
    await api("POST", `/api/rental-invoices/${invoice.id}/issue`)
  ).data;
  console.log({ status: issued.status, grandTotal: issued.grandTotal });

  console.log("\n========== FLOW COMPLETE ==========");
  console.log(
    JSON.stringify(
      {
        customerId: customer.id,
        customerName: customer.name,
        productId: product.id,
        warehouseId: warehouse.id,
        rentalOrderId: order.id,
        orderNumber,
        dispatchId: dispatch.id,
        dispatchNumber,
        returnId: ret.id,
        returnNumber,
        invoiceId: invoice.id,
        invoiceNumber,
        invoiceStatus: issued.status,
        grandTotal: issued.grandTotal,
        urls: {
          order: `${BASE}/rental-orders/${order.id}`,
          dispatch: `${BASE}/dispatches/${dispatch.id}`,
          return: `${BASE}/returns/${ret.id}`,
          invoice: `${BASE}/rental-invoices/${invoice.id}`,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("\nFLOW FAILED:", error.message);
  process.exit(1);
});
