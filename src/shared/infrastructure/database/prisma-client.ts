import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabasePoolConfig } from "@/shared/config/database.config";
import { rlsSessionExtension } from "@/shared/infrastructure/tenancy/rls-session.extension";
import { tenantGuardExtension } from "@/shared/infrastructure/tenancy/tenant-guard.extension";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(getDatabasePoolConfig());

  // Every model query (including inside $transaction) passes through the
  // organization guard, and every query (raw SQL too) tells PostgreSQL its
  // business so row-level security can enforce it. Start transactions with
  // runTenantTransaction(). The extended client keeps PrismaClient's API.
  return new PrismaClient({ adapter })
    .$extends(tenantGuardExtension)
    .$extends(rlsSessionExtension) as unknown as PrismaClient;
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
});

export default prisma;
