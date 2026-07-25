export type MockListRow = {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Build hundreds of rows to stress list/table UI under load. */
export function buildLargeDataset(count = 250): MockListRow[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return {
      id: `row-${n}`,
      customerCode: `C-${String(n).padStart(4, "0")}`,
      name: `Customer ${n} — Manyar Tent ${n % 7 === 0 ? "Wedding Package" : "Standard"}`,
      phone: `03${String(100000000 + n).slice(0, 9)}`,
      cnic: n % 3 === 0 ? `12345-${String(1000000 + n).slice(0, 7)}-1` : null,
      address:
        n % 9 === 0
          ? "A deliberately long venue address near Main Bazaar, Malakand, with additional delivery directions"
          : `Street ${n}, Malakand`,
      notes:
        n % 11 === 0
          ? "Long note that could wrap and create visual noise in dense tables: delivery window, contact preference, and site access instructions."
          : null,
      isActive: n % 5 !== 0,
      createdAt: new Date(Date.UTC(2025, 0, (n % 28) + 1)).toISOString(),
      updatedAt: new Date(Date.UTC(2026, 0, (n % 28) + 1)).toISOString(),
    };
  });
}

export function buildPaginationMeta(total: number, page = 1, pageSize = 20) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
