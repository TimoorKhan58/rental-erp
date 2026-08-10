import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  SEED_EXPENSE_CATEGORIES,
  SEED_NOTIFICATION_TEMPLATES,
  SEED_ROLES,
  SEED_UNITS_OF_MEASURE,
} from "./seed-data";

function createSeedClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run prisma db seed");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

async function main(): Promise<void> {
  const prisma = createSeedClient();
  const now = new Date();

  try {
    const roles = await prisma.role.createMany({
      data: SEED_ROLES.map((role) => ({
        id: role.id,
        name: role.name,
      })),
      skipDuplicates: true,
    });

    const units = await prisma.unitOfMeasure.createMany({
      data: SEED_UNITS_OF_MEASURE.map((unit) => ({
        id: unit.id,
        code: unit.code,
        name: unit.name,
        description: unit.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })),
      skipDuplicates: true,
    });

    const categories = await prisma.expenseCategory.createMany({
      data: SEED_EXPENSE_CATEGORIES.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })),
      skipDuplicates: true,
    });

    const notificationTemplates = await prisma.notificationTemplate.createMany({
      data: SEED_NOTIFICATION_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        eventKey: template.eventKey,
        channel: template.channel,
        title: template.title,
        body: template.body,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })),
      skipDuplicates: true,
    });

    console.log(
      `Seed complete: roles +${roles.count}, units +${units.count}, expense categories +${categories.count}, notification templates +${notificationTemplates.count}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
