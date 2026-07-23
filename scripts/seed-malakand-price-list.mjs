/**
 * Seed Malakand Tent & Catering price-list products (2019 rate card).
 *
 * Names include English + Urdu. Rent rates are from the price list.
 * Purchase/actual costs are estimated replacement values (PKR).
 *
 * Usage (from rental-erp/):
 *   node ./scripts/seed-malakand-price-list.mjs
 *
 * Re-run safely: removes prior MTC-* products first.
 */
import "dotenv/config";
import pg from "pg";
import { randomUUID } from "node:crypto";

const { Client } = pg;

const PREFIX = "MTC";
const CATEGORY_NAME = "Malakand Tent & Catering";

/**
 * rate = rental price from price list (PKR)
 * cost = estimated actual / purchase / replacement cost (PKR)
 * stock = starting on-hand quantity
 */
const PRODUCTS = [
  // Tents & coverings
  { code: `${PREFIX}-001`, name: "45×45 Chhatri / 45×45 چھتری", description: "Large ceremonial umbrella / canopy", unit: "PCS", rate: 7500, cost: 180000, stock: 4 },
  { code: `${PREFIX}-002`, name: "30×30 Chhatri / 30×30 چھتری", description: "Medium ceremonial umbrella / canopy", unit: "PCS", rate: 4000, cost: 95000, stock: 6 },
  { code: `${PREFIX}-003`, name: "VIP Shamiana / VIP شامیانہ", description: "Premium VIP tent / shamiana", unit: "PCS", rate: 500, cost: 12000, stock: 40 },
  { code: `${PREFIX}-004`, name: "Local Shamiana / شامیانہ لوکل", description: "Standard local tent / shamiana", unit: "PCS", rate: 300, cost: 6500, stock: 60 },
  { code: `${PREFIX}-005`, name: "Tarpaulin 15×15 / ترپال 15-15", description: "15×15 tarpaulin sheet", unit: "PCS", rate: 300, cost: 4500, stock: 50 },
  { code: `${PREFIX}-006`, name: "VIP Qanat (Side Wall) / قنات VIP", description: "VIP tent side wall panel", unit: "PCS", rate: 100, cost: 2500, stock: 80 },
  { code: `${PREFIX}-007`, name: "Local Qanat (Side Wall) / قنات لوکل", description: "Local tent side wall panel", unit: "PCS", rate: 70, cost: 1500, stock: 100 },

  // Seating & tables
  { code: `${PREFIX}-008`, name: "Foam Chair / فوم کرسی", description: "Padded foam chair", unit: "PCS", rate: 30, cost: 2800, stock: 500 },
  { code: `${PREFIX}-009`, name: "Simple Chair / کرسی سادہ", description: "Plain plastic/metal chair", unit: "PCS", rate: 15, cost: 1200, stock: 800 },
  { code: `${PREFIX}-010`, name: "Dinner Table / ڈنر میز", description: "Dinner / banquet table", unit: "PCS", rate: 70, cost: 5500, stock: 80 },
  { code: `${PREFIX}-011`, name: "Table 2.5×4 / میز ڈھائی چار", description: "2.5×4 rectangular table", unit: "PCS", rate: 150, cost: 9000, stock: 40 },
  { code: `${PREFIX}-012`, name: "2.5×4 Table Top / ڈھائی چار ٹاپ", description: "2.5×4 tabletop only", unit: "PCS", rate: 50, cost: 3500, stock: 50 },
  { code: `${PREFIX}-013`, name: "Round Table Cloth / گول میز کپڑا", description: "Cloth cover for round table", unit: "PCS", rate: 300, cost: 4500, stock: 60 },

  // Serving bowls & plates
  { code: `${PREFIX}-014`, name: "Round Ghori / غوری گول", description: "Round serving bowl (ghori)", unit: "PCS", rate: 10, cost: 800, stock: 200 },
  { code: `${PREFIX}-015`, name: "Fancy Ghori / غوری فینسی", description: "Fancy decorative serving bowl", unit: "PCS", rate: 10, cost: 1200, stock: 150 },
  { code: `${PREFIX}-016`, name: "Steel Ghori / غوری سٹیل والا", description: "Steel serving bowl", unit: "PCS", rate: 6, cost: 600, stock: 200 },
  { code: `${PREFIX}-017`, name: "Big Bowl / باؤل بڑا", description: "Large serving bowl", unit: "PCS", rate: 8, cost: 700, stock: 180 },
  { code: `${PREFIX}-018`, name: "Medium Bowl / باؤل درمیانہ", description: "Medium serving bowl", unit: "PCS", rate: 8, cost: 550, stock: 200 },
  { code: `${PREFIX}-019`, name: "Halwa Bowl / حلوہ کنڈول", description: "Halwa serving bowl (kandol)", unit: "PCS", rate: 6, cost: 500, stock: 150 },
  { code: `${PREFIX}-020`, name: "Full Size Plate / پلیٹ فل سائز", description: "Full-size dinner plate", unit: "PCS", rate: 10, cost: 450, stock: 400 },
  { code: `${PREFIX}-021`, name: "Quarter Plate / پلیٹ کواٹر", description: "Quarter / side plate", unit: "PCS", rate: 10, cost: 350, stock: 400 },
  { code: `${PREFIX}-022`, name: "Station Dish / سٹیشن ڈش", description: "Buffet station dish", unit: "PCS", rate: 250, cost: 4500, stock: 40 },

  // Cutlery & drinkware
  { code: `${PREFIX}-023`, name: "Eating Spoon / کھانے کا چمچ", description: "Dining spoon", unit: "PCS", rate: 5, cost: 80, stock: 1000 },
  { code: `${PREFIX}-024`, name: "Serving Spoon / ڈونگہ چمچ", description: "Large serving spoon (donga)", unit: "PCS", rate: 5, cost: 150, stock: 300 },
  { code: `${PREFIX}-025`, name: "Skimmer / کف گیر", description: "Skimmer / large ladle (kafgir)", unit: "PCS", rate: 6, cost: 200, stock: 100 },
  { code: `${PREFIX}-026`, name: "Steel Jug with 2 Glasses / سٹیل جگ دوگلاس", description: "Steel jug set with 2 glasses", unit: "SET", rate: 25, cost: 900, stock: 120 },
  { code: `${PREFIX}-027`, name: "Glass Jug with 2 Glasses / شیشے جگ دوگلاس", description: "Glass jug set with 2 glasses", unit: "SET", rate: 50, cost: 1800, stock: 80 },

  // Coolers & kitchen
  { code: `${PREFIX}-028`, name: "Steel Water Cooler / سٹیل کولر", description: "Steel water cooler", unit: "PCS", rate: 200, cost: 8500, stock: 30 },
  { code: `${PREFIX}-029`, name: "Plastic Water Cooler / پلاسٹک کولر", description: "Plastic water cooler", unit: "PCS", rate: 150, cost: 4500, stock: 40 },
  { code: `${PREFIX}-030`, name: "Tub / ٹپ", description: "Large tub / basin", unit: "PCS", rate: 120, cost: 3500, stock: 25 },
  { code: `${PREFIX}-031`, name: "Trunk / Box / صندوق", description: "Storage trunk / sandook", unit: "PCS", rate: 300, cost: 8000, stock: 20 },
  { code: `${PREFIX}-032`, name: "Samovar (Tea Urn) / سموار", description: "Traditional tea samovar", unit: "PCS", rate: 150, cost: 6500, stock: 25 },
  { code: `${PREFIX}-033`, name: "Large Serving Tray / خوانچہ بڑا", description: "Large khwancha serving tray", unit: "PCS", rate: 50, cost: 2200, stock: 60 },
  { code: `${PREFIX}-034`, name: "Small Cooking Pot / پتیلہ چھوٹا", description: "Small cooking pot (patila)", unit: "PCS", rate: 200, cost: 7500, stock: 30 },
  { code: `${PREFIX}-035`, name: "Large Cooking Pot / پتیلہ بڑا", description: "Large cooking pot (patila)", unit: "PCS", rate: 400, cost: 16000, stock: 20 },
  { code: `${PREFIX}-036`, name: "Angithi (Stove) / انگیٹھی", description: "Traditional stove / angithi", unit: "PCS", rate: 30, cost: 2500, stock: 40 },

  // Floor coverings
  { code: `${PREFIX}-037`, name: "Mat / چٹائی", description: "Floor mat / chattai", unit: "PCS", rate: 70, cost: 2200, stock: 100 },
  { code: `${PREFIX}-038`, name: "Dari (Rug) / دری", description: "Woven rug / dari", unit: "PCS", rate: 50, cost: 1800, stock: 80 },
  { code: `${PREFIX}-039`, name: "Namdi (Felt Mat) / نمدی", description: "Felt floor mat / namdi", unit: "PCS", rate: 30, cost: 900, stock: 100 },
  { code: `${PREFIX}-040`, name: "Dastarkhwan / دسترخوان", description: "Floor dining cloth / dastarkhwan", unit: "PCS", rate: 20, cost: 600, stock: 150 },

  // Tea & extras
  { code: `${PREFIX}-041`, name: "Simple Bowl / Cup / پیالہ سادہ", description: "Simple bowl / cup (pyala)", unit: "PCS", rate: 3, cost: 120, stock: 500 },
  { code: `${PREFIX}-042`, name: "Thermos / ترماس", description: "Thermos flask", unit: "PCS", rate: 60, cost: 2200, stock: 40 },
  { code: `${PREFIX}-043`, name: "Tea Cup / چائے کپ", description: "Tea cup", unit: "PCS", rate: 40, cost: 350, stock: 300 },
  { code: `${PREFIX}-044`, name: "Foam Chair Cover / فوم کرسی کور", description: "Cover for foam chair", unit: "PCS", rate: 20, cost: 450, stock: 400 },
  { code: `${PREFIX}-045`, name: "Fan / پنکھا", description: "Standing / pedestal fan", unit: "PCS", rate: 300, cost: 12000, stock: 30 },

  // Stage & structure
  { code: `${PREFIX}-046`, name: "Stage Table / سٹیج میز", description: "Stage table", unit: "PCS", rate: 400, cost: 15000, stock: 20 },
  { code: `${PREFIX}-047`, name: "Ladder / سیڑھی", description: "Ladder", unit: "PCS", rate: 100, cost: 4500, stock: 15 },
  { code: `${PREFIX}-048`, name: "Complete Stage Set / سٹیج مکمل سیٹ", description: "Full stage setup package", unit: "SET", rate: 7000, cost: 220000, stock: 3 },
  { code: `${PREFIX}-049`, name: "Entry Gate / انٹرگیٹ", description: "Decorative entry gate", unit: "PCS", rate: 1000, cost: 35000, stock: 8 },
  { code: `${PREFIX}-050`, name: "Electric Board / بجلی کا بورڈ", description: "Electrical distribution board", unit: "PCS", rate: 60, cost: 3500, stock: 20 },
  { code: `${PREFIX}-051`, name: "Nail / Stake / کیل", description: "Tent nail / ground stake", unit: "PCS", rate: 15, cost: 80, stock: 1000 },
  { code: `${PREFIX}-052`, name: "Bamboo Pole / بانس", description: "Bamboo pole for tent structure", unit: "PCS", rate: 15, cost: 200, stock: 500 },
];

async function cleanup(client) {
  await client.query(
    `
    DELETE FROM inventory_transactions
    WHERE "inventoryId" IN (
      SELECT i.id FROM inventory i
      JOIN products p ON p.id = i."productId"
      WHERE p."productCode" LIKE $1
    )
  `,
    [`${PREFIX}-%`],
  );

  await client.query(
    `
    DELETE FROM inventory
    WHERE "productId" IN (SELECT id FROM products WHERE "productCode" LIKE $1)
  `,
    [`${PREFIX}-%`],
  );

  await client.query(`DELETE FROM products WHERE "productCode" LIKE $1`, [`${PREFIX}-%`]);
  await client.query(`DELETE FROM categories WHERE name = $1`, [CATEGORY_NAME]);
}

async function ensureUnits(client) {
  for (const unit of [
    { code: "PCS", name: "Pieces", description: "Individual items" },
    { code: "SET", name: "Set", description: "Grouped item set" },
  ]) {
    await client.query(
      `INSERT INTO units_of_measure (id, code, name, description, "isActive", "createdAt", "updatedAt")
       VALUES ($1::uuid, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [randomUUID(), unit.code, unit.name, unit.description],
    );
  }

  const res = await client.query(
    `SELECT id, code FROM units_of_measure WHERE code IN ('PCS', 'SET') AND "isActive" = true`,
  );
  const byCode = Object.fromEntries(res.rows.map((r) => [r.code, r.id]));
  if (!byCode.PCS) {
    throw new Error("Unit PCS missing — run: npm run db:migrate:deploy");
  }
  return byCode;
}

async function ensureWarehouse(client) {
  const existing = await client.query(
    `SELECT id FROM warehouses WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1`,
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const id = randomUUID();
  await client.query(
    `INSERT INTO warehouses (
       id, "warehouseCode", name, description, address, "contactPerson", phone,
       "isActive", "createdAt", "updatedAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW())`,
    [
      id,
      `${PREFIX}-WH-MAIN`,
      "Malakand Main Yard",
      "Primary stock yard for tent & catering hire",
      "Malakand",
      "Yard Supervisor",
      null,
    ],
  );
  return id;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Load rental-erp/.env first.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    await cleanup(client);

    const unitByCode = await ensureUnits(client);
    const warehouseId = await ensureWarehouse(client);

    const categoryId = randomUUID();
    await client.query(
      `INSERT INTO categories (id, name, description, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, NOW(), NOW())`,
      [
        categoryId,
        CATEGORY_NAME,
        "Price-list catalog — tent, seating, catering & stage hire (Urdu + English)",
      ],
    );

    let inserted = 0;
    for (const p of PRODUCTS) {
      const productId = randomUUID();
      const unitId = unitByCode[p.unit] ?? unitByCode.PCS;

      await client.query(
        `INSERT INTO products (
           id, "productCode", "categoryId", "unitId", name, description,
           "purchaseCost", "rentalPricePerDay", "totalQuantity", "minimumStock",
           unit, "isRentable", "isActive", "createdAt", "updatedAt"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,true,NOW(),NOW())`,
        [
          productId,
          p.code,
          categoryId,
          unitId,
          p.name,
          p.description,
          p.cost,
          p.rate,
          p.stock,
          Math.max(1, Math.floor(p.stock * 0.1)),
          p.unit,
        ],
      );

      await client.query(
        `INSERT INTO inventory (
           id, "productId", "warehouseId", "quantityOnHand", "reservedQuantity",
           "minimumStock", "maximumStock", "isActive", "createdAt", "updatedAt"
         ) VALUES ($1,$2,$3,$4,0,$5,$6,true,NOW(),NOW())`,
        [
          randomUUID(),
          productId,
          warehouseId,
          p.stock,
          Math.max(1, Math.floor(p.stock * 0.1)),
          Math.max(p.stock * 2, 10),
        ],
      );

      inserted += 1;
    }

    await client.query("COMMIT");
    console.log(`✓ Seeded ${inserted} Malakand Tent & Catering products`);
    console.log(`  Category: ${CATEGORY_NAME}`);
    console.log(`  Codes: ${PREFIX}-001 … ${PREFIX}-052`);
    console.log(`  Names: English + Urdu | Rent = price list | Cost = estimated purchase`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
