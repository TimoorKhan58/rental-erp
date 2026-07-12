/**
 * Local-only bootstrap: seed ERP roles + one owner login.
 * Usage: node --import tsx scripts/bootstrap-local-admin.mts
 */
import { config } from "dotenv";
import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

config();

const email = process.env.BOOTSTRAP_EMAIL ?? "admin@localhost.local";
const password = process.env.BOOTSTRAP_PASSWORD ?? "Admin123!Local";
const name = process.env.BOOTSTRAP_NAME ?? "Local Admin";

const roles = [
  { id: "00000000-0000-4000-8000-000000000001", name: "owner" },
  { id: "00000000-0000-4000-8000-000000000002", name: "manager" },
  { id: "00000000-0000-4000-8000-000000000003", name: "worker" },
  { id: "00000000-0000-4000-8000-000000000004", name: "accountant" },
  { id: "00000000-0000-4000-8000-000000000005", name: "viewer" },
] as const;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: { id: role.id, name: role.name },
      update: {},
    });
  }

  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: { name: "owner" },
  });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ERP user already exists: ${email}`);
    console.log(`Login at http://localhost:3000/login`);
    process.exit(0);
  }

  const authUserId = generateId();
  const accountId = generateId();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const erpUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        roleId: ownerRole.id,
        isActive: true,
      },
    });

    await tx.authUser.create({
      data: {
        id: authUserId,
        name,
        email,
        role: "owner",
        erpUserId: user.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.authAccount.create({
      data: {
        id: accountId,
        accountId: authUserId,
        providerId: "credential",
        userId: authUserId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });

    return tx.user.update({
      where: { id: user.id },
      data: { authUserId },
    });
  });

  console.log("Bootstrap OK");
  console.log(`  ERP user id: ${erpUser.id}`);
  console.log(`  email:       ${email}`);
  console.log(`  password:    ${password}`);
  console.log(`  login:       http://localhost:3000/login`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
