import { describe, expect, it, vi } from "vitest";

import { CategoryService } from "@/modules/asset/application/services/category.service";

import {
  CATEGORY_ID,
  VALID_CREATE_CATEGORY_INPUT,
} from "../tests/helpers/asset-category.fixtures";

function createFacade() {
  const getCategoryById = { execute: vi.fn() };
  const listCategories = { execute: vi.fn() };
  const createCategory = { execute: vi.fn() };
  const updateCategory = { execute: vi.fn() };
  const deleteCategory = { execute: vi.fn() };

  const service = new CategoryService(
    getCategoryById as never,
    listCategories as never,
    createCategory as never,
    updateCategory as never,
    deleteCategory as never,
  );

  return {
    service,
    getCategoryById,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

describe("CategoryService facade", () => {
  it("delegates getById", async () => {
    const { service, getCategoryById } = createFacade();
    getCategoryById.execute.mockResolvedValue({ id: CATEGORY_ID });

    await service.getById({ id: CATEGORY_ID });

    expect(getCategoryById.execute).toHaveBeenCalledWith({ id: CATEGORY_ID });
  });

  it("delegates list", async () => {
    const { service, listCategories } = createFacade();
    listCategories.execute.mockResolvedValue({ items: [], meta: {} });

    await service.list({ page: 1, pageSize: 10, sortOrder: "desc" });

    expect(listCategories.execute).toHaveBeenCalled();
  });

  it("delegates create", async () => {
    const { service, createCategory } = createFacade();

    await service.create(VALID_CREATE_CATEGORY_INPUT);

    expect(createCategory.execute).toHaveBeenCalledWith(
      VALID_CREATE_CATEGORY_INPUT,
    );
  });

  it("delegates update", async () => {
    const { service, updateCategory } = createFacade();
    const updateInput = { name: "Updated Category" };

    await service.update({ id: CATEGORY_ID }, updateInput);

    expect(updateCategory.execute).toHaveBeenCalledWith(
      { id: CATEGORY_ID },
      updateInput,
    );
  });

  it("delegates delete", async () => {
    const { service, deleteCategory } = createFacade();

    await service.delete({ id: CATEGORY_ID });

    expect(deleteCategory.execute).toHaveBeenCalledWith({ id: CATEGORY_ID });
  });
});
