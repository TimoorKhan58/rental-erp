import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RentalOrderLifecycleStrip } from "./rental-order-lifecycle-strip";

describe("RentalOrderLifecycleStrip", () => {
  it("renders real domain statuses and marks the current step", () => {
    const html = renderToStaticMarkup(
      <RentalOrderLifecycleStrip status="RESERVED" />,
    );

    expect(html).toContain("Draft");
    expect(html).toContain("Confirmed");
    expect(html).toContain("Reserved");
    expect(html).toContain('aria-current="step"');
    expect(html).not.toContain("Cancelled");
  });

  it("renders a closed lifecycle message for cancelled orders", () => {
    const html = renderToStaticMarkup(
      <RentalOrderLifecycleStrip status="CANCELLED" />,
    );

    expect(html.toLowerCase()).toContain("cancelled");
    expect(html).not.toContain("Dispatched");
  });
});
