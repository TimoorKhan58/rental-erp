export function matchesInvoiceDateRange(
  invoiceDate: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) {
    return true;
  }

  const timestamp = new Date(invoiceDate).getTime();

  if (from && timestamp < new Date(from).getTime()) {
    return false;
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    if (timestamp > end.getTime()) {
      return false;
    }
  }

  return true;
}

export function groupLineItemsByCategory(
  items: Array<{ lineType: string; lineTotal: number }>,
) {
  const charges = items.filter(
    (item) => item.lineType !== "DISCOUNT" && item.lineType !== "TAX",
  );
  const discounts = items.filter((item) => item.lineType === "DISCOUNT");
  const taxes = items.filter((item) => item.lineType === "TAX");

  return { charges, discounts, taxes };
}
