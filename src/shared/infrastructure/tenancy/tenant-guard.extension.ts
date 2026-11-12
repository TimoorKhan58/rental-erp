import { Prisma } from "@/generated/prisma/client";

import { getOrganizationScope } from "./organization-scope";
import { scopeQueryArgs } from "./scope-query-args";

/**
 * Central organization guard (SaaS phase 2): every model query made through
 * the shared Prisma client is limited to the current request's organization.
 * Raw SQL is not covered here; PostgreSQL row-level security is the second
 * layer for that.
 */
export const tenantGuardExtension = Prisma.defineExtension({
  name: "tenant-guard",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const scoped = scopeQueryArgs(model, operation, args, getOrganizationScope());
        return query(scoped as typeof args);
      },
    },
  },
});
