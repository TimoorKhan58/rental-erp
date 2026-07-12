import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabasePoolConfig } from "@/shared/config/database.config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(getDatabasePoolConfig());

  return new PrismaClient({ adapter });
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
