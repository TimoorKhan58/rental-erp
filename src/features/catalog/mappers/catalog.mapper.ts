import type { CatalogTab } from "../types";

export const CATALOG_TAB_LABELS: Record<CatalogTab, string> = {
  categories: "Categories",
  brands: "Brands",
  units: "Units",
  attributes: "Attributes",
  tags: "Tags",
};

export const CATALOG_TAB_SINGULAR: Record<CatalogTab, string> = {
  categories: "category",
  brands: "brand",
  units: "unit",
  attributes: "attribute",
  tags: "tag",
};
