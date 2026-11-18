import { describe, expect, it } from "vitest";

import { countLabel, pluralWord } from "./plural";

describe("countLabel (usability revamp R1)", () => {
  it("uses the singular only for exactly one", () => {
    expect(countLabel(1, "item")).toBe("1 item");
    expect(countLabel(0, "item")).toBe("0 items");
    expect(countLabel(3, "item")).toBe("3 items");
  });

  it("takes an irregular plural and formats large numbers", () => {
    expect(countLabel(2, "delivery", "deliveries")).toBe("2 deliveries");
    expect(countLabel(9350, "item")).toMatch(/^9[, . ]?350 items$/);
  });

  it("gives just the word for sentences", () => {
    expect(pluralWord(1, "return")).toBe("return");
    expect(pluralWord(4, "return")).toBe("returns");
  });
});
