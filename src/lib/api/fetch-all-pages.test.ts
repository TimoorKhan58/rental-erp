import { describe, expect, it, vi } from "vitest";

import { fetchAllPages } from "./fetch-all-pages";

function pageOf(total: number) {
  return vi.fn(async ({ page = 1, pageSize = 100 }: { page?: number; pageSize?: number; isActive?: boolean }) => {
    const start = (page - 1) * pageSize;
    const items = Array.from({ length: Math.max(0, Math.min(pageSize, total - start)) }, (_, i) => start + i);
    return { items, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  });
}

describe("fetchAllPages (QA huge-data run)", () => {
  it("loads every page, so customer 101 and beyond can be picked", async () => {
    const fetchPage = pageOf(1000);
    const result = await fetchAllPages(fetchPage, { isActive: true });
    expect(result.items).toHaveLength(1000);
    expect(result.items.at(-1)).toBe(999);
    expect(fetchPage).toHaveBeenCalledTimes(10);
    expect(fetchPage).toHaveBeenCalledWith({ isActive: true, page: 2, pageSize: 100 });
  });

  it("makes one call when everything fits on one page", async () => {
    const fetchPage = pageOf(40);
    const result = await fetchAllPages(fetchPage, {});
    expect(result.items).toHaveLength(40);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("stops at 5,000 rows", async () => {
    const fetchPage = pageOf(9000);
    const result = await fetchAllPages(fetchPage, {});
    expect(result.items).toHaveLength(5000);
  });
});
