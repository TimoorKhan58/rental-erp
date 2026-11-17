import { Prisma } from "@/generated/prisma/client";

import { getOrganizationScope } from "./organization-scope";
import { applyRlsSettings, getRlsTransaction, planRlsQuery } from "./rls-session";

type InternalParams = { __internalParams?: { transaction?: { kind?: string } } };

/**
 * Tells PostgreSQL which business each query works for (SaaS phase 2c), so
 * row-level security can enforce it — including for raw SQL, which the
 * tenant guard cannot see. Applies to every operation, raw queries included.
 *
 * Prisma reports the transaction a query belongs to only through its
 * internal request params; the database isolation tests (test:db) fail if
 * that ever changes.
 */
export const rlsSessionExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: "rls-session",
    query: {
      async $allOperations(params) {
        const { model, args, query } = params;
        const transactionKind = (params as unknown as InternalParams).__internalParams?.transaction
          ?.kind;

        const plan = planRlsQuery({
          model,
          transactionKind,
          scope: getOrganizationScope(),
          transaction: getRlsTransaction(),
        });

        if (plan.action === "run") return query(args);

        const [, result] = await client.$transaction([
          applyRlsSettings(client, plan.settings) as Prisma.PrismaPromise<unknown>,
          query(args) as Prisma.PrismaPromise<unknown>,
        ]);
        return result;
      },
    },
  }),
);
