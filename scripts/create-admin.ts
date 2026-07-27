/**
 * Bootstrap for the first ERP administrator.
 *
 * Usage (from rental-erp/):
 *   npm run create:admin
 *
 * Interactive mode (default):
 *   Prompts for name, email, password, and role.
 *
 * Production mode (non-interactive):
 *   Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_ROLE.
 */
import "dotenv/config";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { USER_ROLE_LIST, USER_ROLE_LABELS, type UserRole } from "../src/constants/roles";
import { createIdentityApplicationServices } from "../src/modules/identity/infrastructure/factories/create-identity.services";
import { createSharedDeps } from "../src/shared/infrastructure/di/shared-deps";
import { ConflictError, NotFoundError } from "../src/shared/infrastructure/errors";

interface AdminCredentials {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

function isUserRole(value: string): value is UserRole {
  return (USER_ROLE_LIST as readonly string[]).includes(value);
}

function hasProductionEnv(): boolean {
  return (
    process.env.ADMIN_NAME !== undefined &&
    process.env.ADMIN_NAME.length > 0 &&
    process.env.ADMIN_EMAIL !== undefined &&
    process.env.ADMIN_EMAIL.length > 0 &&
    process.env.ADMIN_PASSWORD !== undefined &&
    process.env.ADMIN_PASSWORD.length > 0 &&
    process.env.ADMIN_ROLE !== undefined &&
    process.env.ADMIN_ROLE.length > 0
  );
}

function resolveProductionCredentials(): AdminCredentials {
  const name = process.env.ADMIN_NAME!.trim();
  const email = process.env.ADMIN_EMAIL!.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD!;
  const role = process.env.ADMIN_ROLE!.trim().toLowerCase();

  if (name.length === 0) {
    throw new Error("ADMIN_NAME must not be empty");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  if (!isUserRole(role)) {
    throw new Error(
      `ADMIN_ROLE must be one of: ${USER_ROLE_LIST.join(", ")}`,
    );
  }

  return { name, email, password, role };
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

async function resolveInteractiveCredentials(
  rl: ReturnType<typeof createInterface>,
): Promise<AdminCredentials> {
  console.log("Create initial ERP administrator\n");

  const name = await promptRequired(rl, "Name");
  const email = (await promptRequired(rl, "Email")).toLowerCase();
  const password = await promptPassword(rl);
  const role = await promptRole(rl);

  return { name, email, password, role };
}

async function bootstrapAdministrator(
  credentials: AdminCredentials,
): Promise<void> {
  const deps = createSharedDeps();

  try {
    const services = createIdentityApplicationServices(deps);
    const { name, email, password, role } = credentials;

    const existingAuthUser = await deps.prisma.authUser.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingAuthUser !== null) {
      console.log("\nAdministrator already exists.");
      return;
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
  } finally {
    await deps.prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const productionMode = hasProductionEnv();
  const rl = productionMode ? null : createInterface({ input, output });

  try {
    const credentials = productionMode
      ? resolveProductionCredentials()
      : await resolveInteractiveCredentials(rl!);

    await bootstrapAdministrator(credentials);
  } catch (error) {
    if (error instanceof ConflictError) {
      console.log("\nAdministrator already exists.");
      return;
    }

    if (error instanceof NotFoundError) {
      console.error(
        `\nError: ${error.message}. Run "npx prisma db seed" to create roles first.`,
      );
      process.exitCode = 1;
      return;
    }

    if (error instanceof Error) {
      console.error(`\nError: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    console.error("\nFailed to create administrator:", error);
    process.exitCode = 1;
  } finally {
    rl?.close();
  }
}

main();
