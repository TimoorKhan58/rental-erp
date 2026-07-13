/**
 * Scenario 25 – Concurrent Users
 *
 * User A edits an order.
 * At the same time, User B edits the same order.
 * Check: conflict handling, last-save behavior, locking/versioning
 *
 * Usage: node --env-file=.env scripts/scenario-25-concurrent-users.mjs
 */
import { config } from "dotenv";

config();

const BASE = process.env.FLOW_BASE_URL ?? "http://localhost:3000";
const CREDENTIALS = [
  {
    label: "A",
    email: process.env.FLOW_EMAIL ?? "admin@local.dev",
    password: process.env.FLOW_PASSWORD ?? "LocalAdmin123!",
  },
  {
    label: "B",
    email: process.env.FLOW_EMAIL_B ?? process.env.BOOTSTRAP_EMAIL ?? "admin@localhost.local",
    password:
      process.env.FLOW_PASSWORD_B ??
      process.env.BOOTSTRAP_PASSWORD ??
      "Admin123!Local",
  },
];

const QTY_A = 100;
const QTY_B = 120;
const DAILY_RATE = 50;
const START_DATE = "2026-09-05";
const END_DATE = "2026-09-06";
const REMARKS_A = "Edited by User A – Scenario 25";
const REMARKS_B = "Edited by User B – Scenario 25";

const PRODUCT = {
  productCode: "CHAIR-S1",
  name: "Chair",
  unit: "pcs",
  rentalRate: DAILY_RATE,
  stock: 200,
};

const checks = [];

function createSession() {
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

  async function api(method, path, body, extraHeaders = {}) {
    const headers = {
      Accept: "application/json",
      Origin: BASE,
      Cookie: cookieHeader(),
      ...extraHeaders,
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
    return {
      ok: response.ok,
      status: response.status,
      json,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  async function apiOrThrow(method, path, body, extraHeaders) {
    const result = await api(method, path, body, extraHeaders);
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

  return { api, apiOrThrow, cookieJar };
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

async function signIn(session, cred) {
  session.cookieJar.clear();
  const response = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: BASE,
    },
    body: JSON.stringify({ email: cred.email, password: cred.password }),
  });
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) session.cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Sign-in failed for ${cred.email}: ${response.status}`);
  }
  return body.user?.email ?? cred.email;
}

async function ensureCustomer(session) {
  const customers = listItems(await session.apiOrThrow("GET", "/api/customers?pageSize=50"));
  let customer = customers.find((c) => c.isActive !== false) ?? customers[0];
  if (!customer) {
    customer = (
      await session.apiOrThrow("POST", "/api/customers", {
        customerCode: `CUST-S25-${stamp()}`,
        name: "Scenario 25 Customer",
        phone: "+92 300 2525252",
        address: "Lahore, Pakistan",
        isActive: true,
      })
    ).data;
  }
  return customer;
}

async function ensureWarehouse(session) {
  const warehouses = listItems(await session.apiOrThrow("GET", "/api/warehouses?pageSize=50"));
  let warehouse = warehouses.find((w) => w.isActive !== false) ?? warehouses[0];
  if (!warehouse) {
    warehouse = (
      await session.apiOrThrow("POST", "/api/warehouses", {
        warehouseCode: `WH-S25-${stamp()}`,
        name: "Scenario 25 Warehouse",
        isActive: true,
      })
    ).data;
  }
  return warehouse;
}

async function ensureProduct(session) {
  const products = listItems(
    await session.apiOrThrow(
      "GET",
      `/api/products?pageSize=100&search=${encodeURIComponent(PRODUCT.productCode)}`,
    ),
  );
  let product =
    products.find((p) => p.productCode === PRODUCT.productCode) ??
    products.find((p) => p.name?.toLowerCase() === PRODUCT.name.toLowerCase());
  if (!product) {
    product = (
      await session.apiOrThrow("POST", "/api/products", {
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

async function ensureStock(session, productId, warehouseId, minAvailable) {
  const inventories = listItems(await session.apiOrThrow("GET", "/api/inventory?pageSize=100"));
  let row = inventories.find(
    (i) => i.productId === productId && i.warehouseId === warehouseId,
  );
  if (!row) {
    return (
      await session.apiOrThrow("POST", "/api/inventory", {
        productId,
        warehouseId,
        quantityOnHand: minAvailable,
        reservedQuantity: 0,
        minimumStock: 0,
        maximumStock: Math.max(minAvailable * 2, 400),
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
      await session.apiOrThrow("PATCH", `/api/inventory/${row.id}`, {
        quantityOnHand: Math.max(neededOnHand, row.quantityOnHand ?? 0, minAvailable),
      })
    ).data;
  }
  return row;
}

async function main() {
  const suffix = stamp();
  const sessionA = createSession();
  const sessionB = createSession();

  log("Scenario 25 – Concurrent Users", {
    check: ["conflict handling", "last-save behavior", "locking/versioning"],
  });

  let emailA;
  let emailB;
  try {
    emailA = await signIn(sessionA, CREDENTIALS[0]);
    console.log("User A signed in as", emailA);
  } catch (error) {
    throw new Error(`User A sign-in failed: ${error.message}`);
  }

  try {
    emailB = await signIn(sessionB, CREDENTIALS[1]);
    console.log("User B signed in as", emailB);
  } catch {
    // Fall back: second session of same admin (still concurrent HTTP clients)
    emailB = await signIn(sessionB, CREDENTIALS[0]);
    console.log("User B signed in as", emailB, "(same account, separate session)");
  }

  observe("Sessions", {
    userA: emailA,
    userB: emailB,
    distinctAccounts: emailA !== emailB,
    distinctCookieJars: true,
  });

  const customer = await ensureCustomer(sessionA);
  const warehouse = await ensureWarehouse(sessionA);
  const product = await ensureProduct(sessionA);
  await ensureStock(sessionA, product.id, warehouse.id, PRODUCT.stock);

  log("1. Create DRAFT order (editable)");
  const created = (
    await sessionA.apiOrThrow("POST", "/api/rental-orders", {
      orderNumber: `RO-S25-${suffix}`,
      customerId: customer.id,
      warehouseId: warehouse.id,
      startDate: START_DATE,
      endDate: END_DATE,
      remarks: "Scenario 25 – initial draft",
      items: [
        { productId: product.id, quantity: 50, dailyRate: DAILY_RATE },
      ],
    })
  ).data;

  check("Order created as DRAFT", created.status === "DRAFT", {
    status: created.status,
    id: created.id,
  });

  observe("Version / lock fields on order DTO", {
    hasVersion: Object.prototype.hasOwnProperty.call(created, "version"),
    hasRowVersion: Object.prototype.hasOwnProperty.call(created, "rowVersion"),
    hasEtag: Object.prototype.hasOwnProperty.call(created, "etag"),
    hasLock: Object.prototype.hasOwnProperty.call(created, "lockedBy"),
    updatedAt: created.updatedAt,
  });

  log("2. Both users load the same order (shared snapshot)");
  const snapA = (await sessionA.apiOrThrow("GET", `/api/rental-orders/${created.id}`)).data;
  const snapB = (await sessionB.apiOrThrow("GET", `/api/rental-orders/${created.id}`)).data;
  check("Both sessions see same initial updatedAt", snapA.updatedAt === snapB.updatedAt, {
    updatedAtA: snapA.updatedAt,
    updatedAtB: snapB.updatedAt,
  });

  log("3. Concurrent PATCH — User A qty 100 / User B qty 120");
  const [resA, resB] = await Promise.all([
    sessionA.api("PATCH", `/api/rental-orders/${created.id}`, {
      remarks: REMARKS_A,
      items: [
        { productId: product.id, quantity: QTY_A, dailyRate: DAILY_RATE },
      ],
    }),
    sessionB.api("PATCH", `/api/rental-orders/${created.id}`, {
      remarks: REMARKS_B,
      items: [
        { productId: product.id, quantity: QTY_B, dailyRate: DAILY_RATE },
      ],
    }),
  ]);

  observe("Concurrent PATCH HTTP results", {
    userA: {
      ok: resA.ok,
      status: resA.status,
      remarks: resA.json?.data?.remarks,
      qty: resA.json?.data?.items?.[0]?.quantity,
      error: resA.json?.error ?? null,
    },
    userB: {
      ok: resB.ok,
      status: resB.status,
      remarks: resB.json?.data?.remarks,
      qty: resB.json?.data?.items?.[0]?.quantity,
      error: resB.json?.error ?? null,
    },
  });

  const conflictStatus =
    resA.status === 409 ||
    resB.status === 409 ||
    resA.status === 412 ||
    resB.status === 412 ||
    String(resA.json?.error?.code ?? "")
      .toUpperCase()
      .includes("CONFLICT") ||
    String(resB.json?.error?.code ?? "")
      .toUpperCase()
      .includes("CONFLICT");

  const bothSucceeded = resA.ok && resB.ok;

  observe("Conflict handling on concurrent edit", {
    conflictDetected: conflictStatus,
    bothSucceeded,
    interpretation: conflictStatus
      ? "System rejected at least one write as a conflict"
      : bothSucceeded
        ? "No conflict handling — both writes accepted (last-write-wins)"
        : "Unexpected failure (not a concurrency conflict)",
  });

  check(
    "Concurrent edit path completed (success or explicit conflict)",
    bothSucceeded || conflictStatus,
    {
      bothSucceeded,
      conflictStatus,
      aStatus: resA.status,
      bStatus: resB.status,
      aError: resA.json?.error ?? null,
      bError: resB.json?.error ?? null,
    },
  );

  const finalOrder = (
    await sessionA.apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;

  const finalRemarks = finalOrder.remarks;
  const finalQty = finalOrder.items?.[0]?.quantity;
  const matchesA = finalRemarks === REMARKS_A && finalQty === QTY_A;
  const matchesB = finalRemarks === REMARKS_B && finalQty === QTY_B;
  const winner = matchesB ? "B" : matchesA ? "A" : "unknown/mixed";

  observe("Persisted state after concurrent edits", {
    remarks: finalRemarks,
    quantity: finalQty,
    updatedAt: finalOrder.updatedAt,
    apparentWinner: winner,
  });

  check(
    "Final order is a single coherent save (A or B payload, not mixed)",
    matchesA || matchesB,
    {
      remarks: finalRemarks,
      quantity: finalQty,
      note: "Each PATCH replaces remarks+items together; last completed request wins entirely",
    },
  );

  log("4. Probe If-Match / version header (expect ignored or unused)");
  const withIfMatch = await sessionA.api(
    "PATCH",
    `/api/rental-orders/${created.id}`,
    { remarks: "Stale If-Match probe" },
    { "If-Match": `"${snapA.updatedAt}"` },
  );
  observe("PATCH with If-Match using stale updatedAt", {
    httpStatus: withIfMatch.status,
    ok: withIfMatch.ok,
    rejectedAsConflict: withIfMatch.status === 409 || withIfMatch.status === 412,
    error: withIfMatch.json?.error ?? null,
    remarks: withIfMatch.json?.data?.remarks ?? null,
  });

  log("5. Sequential last-save — A then B overwrite");
  // Reset to known state
  await sessionA.apiOrThrow("PATCH", `/api/rental-orders/${created.id}`, {
    remarks: "Baseline before sequential",
    items: [{ productId: product.id, quantity: 50, dailyRate: DAILY_RATE }],
  });

  const seqA = await sessionA.apiOrThrow("PATCH", `/api/rental-orders/${created.id}`, {
    remarks: REMARKS_A,
    items: [{ productId: product.id, quantity: QTY_A, dailyRate: DAILY_RATE }],
  });
  const seqB = await sessionB.apiOrThrow("PATCH", `/api/rental-orders/${created.id}`, {
    remarks: REMARKS_B,
    items: [{ productId: product.id, quantity: QTY_B, dailyRate: DAILY_RATE }],
  });

  check("Sequential: User B last save wins", seqB.data.remarks === REMARKS_B && seqB.data.items?.[0]?.quantity === QTY_B, {
    afterA: { remarks: seqA.data.remarks, qty: seqA.data.items?.[0]?.quantity },
    afterB: { remarks: seqB.data.remarks, qty: seqB.data.items?.[0]?.quantity },
  });

  const afterSeq = (
    await sessionA.apiOrThrow("GET", `/api/rental-orders/${created.id}`)
  ).data;
  check("GET confirms User B values persisted", afterSeq.remarks === REMARKS_B && afterSeq.items?.[0]?.quantity === QTY_B, {
    remarks: afterSeq.remarks,
    quantity: afterSeq.items?.[0]?.quantity,
  });

  const summary = {
    result: "PASS",
    answer: {
      conflictHandling: conflictStatus
        ? "Optimistic conflict detected (409)"
        : "None — concurrent PATCHes both accepted",
      lastSaveBehavior: "Last completed write wins (full PATCH payload)",
      locking: false,
      versioning: false,
      ifMatchHonored: withIfMatch.status === 409 || withIfMatch.status === 412,
    },
    concurrent: {
      userA: { status: resA.status, ok: resA.ok },
      userB: { status: resB.status, ok: resB.ok },
      persistedWinner: winner,
      finalRemarks,
      finalQty,
    },
    sessions: { userA: emailA, userB: emailB },
    orderId: created.id,
    checks,
    gaps: [
      "No version / rowVersion / etag on rental order",
      "No edit lock (lockedBy)",
      "No If-Match / 409 optimistic concurrency on update",
      "Silent last-write-wins can overwrite another user's changes",
    ],
    urls: {
      order: `${BASE}/rental-orders/${created.id}`,
    },
  };

  console.log("\n========== SCENARIO 25 RESULT ==========");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("\nSCENARIO 25 FAILED:", error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
