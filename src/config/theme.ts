export const THEME_STORAGE_KEY = "rental-erp-theme";

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export type ThemeOption = (typeof THEME_OPTIONS)[number]["value"];
