import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export type { PrismaClient };

export type TransactionClient = Prisma.TransactionClient;

export type DbClient = PrismaClient | TransactionClient;
