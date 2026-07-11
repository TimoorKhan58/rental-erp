export { appConfig, type AppConfig } from "@/shared/config/app.config";
export {
  databaseConfig,
  getDatabaseUrl,
  isDatabaseConfigured,
  type DatabaseConfig,
} from "@/shared/config/database.config";
export { apiConfig, type ApiConfig } from "./api";
export { PROTECTED_ROUTE_PREFIXES, PUBLIC_ROUTES, ROUTES, type AppRoute, type RouteConfig } from "./routes";
export { THEME_OPTIONS, THEME_STORAGE_KEY, type ThemeOption } from "./theme";
export { designTokens, type DesignTokens } from "./design-tokens";
