/**
 * Creates a platform owner (SaaS phase 3b): a login that manages businesses
 * and belongs to no business. It signs in at the usual login page and lands
 * on /platform; it can never open a business's data.
 *
 * Usage (from rental-erp/):
 *   PLATFORM_OWNER_NAME="Your Name" PLATFORM_OWNER_EMAIL=you@example.com \
 *   PLATFORM_OWNER_PASSWORD='...' npm run platform:create-owner
 *
 * The email must not belong to any existing login (business logins stay
 * business logins). Prefer setting the password from a password manager
 * rather than typing it into shared shell history.
 */
import "dotenv/config";

import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";

import { PasswordSchema } from "../src/shared/application/validation/common-schemas";
import { authConfig } from "../src/shared/config/auth.config";
import { createPrismaClient } from "../src/shared/infrastructure/database/prisma-client";

const PLATFORM_OWNER_ROLE = "platform_owner";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main(): Promise<void> {
  const name = required("PLATFORM_OWNER_NAME");
  const email = required("PLATFORM_OWNER_EMAIL").toLowerCase();
  const password = process.env.PLATFORM_OWNER_PASSWORD ?? "";

  const passwordCheck = PasswordSchema.safeParse(password);
  if (!passwordCheck.success || password.length < authConfig.minPasswordLength) {
    throw new Error(
      `PLATFORM_OWNER_PASSWORD must be at least ${authConfig.minPasswordLength} characters.`,
    );
  }

  const prisma = createPrismaClient();

  try {
    const existing = await prisma.authUser.findUnique({
      where: { email },
      select: { erpUserId: true, platformOwner: { select: { id: true } } },
    });

    if (existing !== null) {
      throw new Error(
        existing.platformOwner !== null
          ? `${email} is already a platform owner.`
          : `${email} already has a login${existing.erpUserId ? " for a business" : ""}; use a different email.`,
      );
    }

    const authUserId = generateId();
    const passwordHash = await hashPassword(password);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.authUser.create({
        data: { id: authUserId, name, email, role: PLATFORM_OWNER_ROLE, createdAt: now, updatedAt: now },
      });
      await tx.authAccount.create({
        data: {
          id: generateId(),
          accountId: authUserId,
          providerId: "credential",
          userId: authUserId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.platformOwner.create({ data: { authUserId } });
    });

    console.log(`Platform owner created: ${name} <${email}>. Sign in at /login; you will land on /platform.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
