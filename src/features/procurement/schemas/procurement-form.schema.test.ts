import { describe, expect, it } from "vitest";

import { receiveProcurementFormSchema } from "./procurement-form.schema";

describe("receiveProcurementFormSchema", () => {
  it("allows zero on skipped lines when another line has quantity", () => {
    const result = receiveProcurementFormSchema.safeParse({
      items: [
        {
          productId: "00000000-0000-4000-8000-000000000001",
          quantity: 0,
          maxQuantity: 5,
        },
        {
          productId: "00000000-0000-4000-8000-000000000002",
          quantity: 2,
          maxQuantity: 4,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects receiving more than remaining quantity", () => {
    const result = receiveProcurementFormSchema.safeParse({
      items: [
        {
          productId: "00000000-0000-4000-8000-000000000001",
          quantity: 6,
          maxQuantity: 5,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
