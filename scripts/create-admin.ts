/**
 * Interactive bootstrap for the first ERP administrator.
 *
 * Usage (from rental-erp/):
 *   npm run create:admin
 */
import "dotenv/config";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { USER_ROLE_LIST, USER_ROLE_LABELS, type UserRole } from "../src/constants/roles";
import { createIdentityApplicationServices } from "../src/modules/identity/infrastructure/factories/create-identity.services";
import { createSharedDeps } from "../src/shared/infrastructure/di/shared-deps";
import { ConflictError, NotFoundError } from "../src/shared/infrastructure/errors";

function isUserRole(value: string): value is UserRole {
  return (USER_ROLE_LIST as readonly string[]).includes(value);
}

async function promptRequired(
  rl: ReturnType<typeof createInterface>,
  label: string,
): Promise<string> {
  while (true) {
    const value = (await rl.question(`${label}: `)).trim();

    if (value.length > 0) {
      return value;
    }

    console.log("Value is required.");
  }
}

async function promptPassword(
  rl: ReturnType<typeof createInterface>,
): Promise<string> {
  while (true) {
    const password = (await rl.question("Password (min 8 chars): ")).trim();

    if (password.length >= 8) {
      return password;
    }

    console.log("Password must be at least 8 characters.");
  }
}

async function promptRole(
  rl: ReturnType<typeof createInterface>,
): Promise<UserRole> {
  console.log("\nAvailable roles:");

  for (const role of USER_ROLE_LIST) {
    console.log(`  - ${role} (${USER_ROLE_LABELS[role]})`);
  }

  while (true) {
    const value = (await rl.question("Role [owner]: ")).trim().toLowerCase();
    const role = value.length === 0 ? "owner" : value;

    if (isUserRole(role)) {
      return role;
    }

    console.log(`Invalid role. Choose one of: ${USER_ROLE_LIST.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const rl = createInterface({ input, output });
  const deps = createSharedDeps();

  try {
    console.log("Create initial ERP administrator\n");

    const name = await promptRequired(rl, "Name");
    const email = (await promptRequired(rl, "Email")).toLowerCase();
    const password = await promptPassword(rl);
    const role = await promptRole(rl);

    const services = createIdentityApplicationServices(deps);

    const existingAuthUser = await deps.prisma.authUser.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingAuthUser !== null) {
      throw new ConflictError({
        message: "Email already exists",
        details: { email },
      });
    }

    const user = await services.createIdentityUser.execute({
      name,
      email,
      password,
      role,
      isActive: true,
    });

    console.log("\nAdministrator created successfully.");
    console.log(`  ERP user id: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
  } catch (error) {
    if (error instanceof ConflictError) {
      console.error(`\nError: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    if (error instanceof NotFoundError) {
      console.error(
        `\nError: ${error.message}. Run "npx prisma db seed" to create roles first.`,
      );
      process.exitCode = 1;
      return;
    }

    console.error("\nFailed to create administrator:", error);
    process.exitCode = 1;
  } finally {
    rl.close();
    await deps.prisma.$disconnect();
  }
}

main();
