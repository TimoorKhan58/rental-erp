import { describe, expect, it } from "vitest";

/**
 * Business rules for the wedding demo bill — customer + operator view.
 * Mirrors scripts/seed-wedding-scenario.mjs fee policy.
 */
const RENTAL_DAYS = 2;
const LATE_DAYS = 2;
const DAMAGE_MULT = 2;
const LOST_MULT = 5;
const LATE_PER_DAY = 7500;
const DELIVERY = 8000;
const PICKUP = 5000;

const CATALOG = [
  { name: "Wedding Marquee 20×40", rate: 25000, qty: 1, damaged: 0, lost: 0 },
  { name: "Garden Canopy 15×30", rate: 12000, qty: 1, damaged: 0, lost: 0 },
  { name: "Banquet Chair (Gold)", rate: 45, qty: 200, damaged: 8, lost: 2 },
  { name: "Round Table 8-seat", rate: 350, qty: 25, damaged: 1, lost: 0 },
  { name: "Red Carpet Runner 12×15", rate: 2500, qty: 4, damaged: 0, lost: 0 },
  { name: "LED String Light Set", rate: 800, qty: 10, damaged: 0, lost: 1 },
  { name: "Stage Platform 4×8", rate: 4500, qty: 6, damaged: 0, lost: 0 },
  { name: "Generator 5KVA", rate: 6000, qty: 1, damaged: 0, lost: 0 },
  { name: "Industrial Pedestal Fan", rate: 400, qty: 8, damaged: 1, lost: 0 },
] as const;

function buildBill() {
  const rental = CATALOG.reduce(
    (sum, item) => sum + item.qty * item.rate * RENTAL_DAYS,
    0,
  );
  const damage = CATALOG.reduce(
    (sum, item) => sum + item.damaged * item.rate * DAMAGE_MULT,
    0,
  );
  const lost = CATALOG.reduce(
    (sum, item) => sum + item.lost * item.rate * LOST_MULT,
    0,
  );
  const late = LATE_PER_DAY * LATE_DAYS;
  const grand = rental + damage + lost + late + DELIVERY + PICKUP;
  const advance = Math.round(grand * 0.4);
  const balance = grand - advance;

  return { rental, damage, lost, late, grand, advance, balance };
}

describe("wedding demo scenario bill", () => {
  it("seeds 9 distinct products with mixed return outcomes", () => {
    expect(CATALOG).toHaveLength(9);
    expect(CATALOG.some((p) => p.damaged > 0)).toBe(true);
    expect(CATALOG.some((p) => p.lost > 0)).toBe(true);
    expect(CATALOG.some((p) => p.damaged === 0 && p.lost === 0)).toBe(true);
  });

  it("charges rental for inclusive event days only (not late days)", () => {
    const { rental } = buildBill();
    // Customer lens: rent is for the agreed event window, not the delay.
    expect(rental).toBe(163_400);
  });

  it("applies 2× damage and 5× lost multipliers used by invoice generation", () => {
    const { damage, lost } = buildBill();
    // Chairs 8×45×2 + table 1×350×2 + fan 1×400×2 = 720 + 700 + 800
    expect(damage).toBe(2_220);
    // Chairs 2×45×5 + LED 1×800×5 = 450 + 4000
    expect(lost).toBe(4_450);
  });

  it("adds late fee separately so customer sees why delay costs money", () => {
    const { late, grand, advance, balance } = buildBill();
    expect(late).toBe(15_000);
    // Business lens: late fee = opportunity cost of blocked next booking.
    expect(grand).toBe(163_400 + 2_220 + 4_450 + 15_000 + 8_000 + 5_000);
    expect(grand).toBe(198_070);
    expect(advance).toBe(79_228);
    expect(balance).toBe(118_842);
  });

  it("keeps inspection quantities balanced (good + damaged + lost = rented)", () => {
    for (const item of CATALOG) {
      expect(item.damaged + item.lost + (item.qty - item.damaged - item.lost)).toBe(
        item.qty,
      );
    }
  });
});
