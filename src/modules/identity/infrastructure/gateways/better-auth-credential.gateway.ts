import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CreateAuthCredentialInput,
  IIdentityAuthGateway,
  ResetAuthCredentialPasswordInput,
  UpdateAuthCredentialInput,
} from "@/modules/identity/application/services/identity-auth.gateway.interface";

export class BetterAuthCredentialGateway implements IIdentityAuthGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async createCredentialUser(
    input: CreateAuthCredentialInput,
  ): Promise<{ authUserId: string }> {
    const authUserId = generateId();
    const accountId = generateId();
    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.authUser.create({
        data: {
          id: authUserId,
          name: input.name,
          email: input.email.trim().toLowerCase(),
          role: input.role,
          erpUserId: input.erpUserId,
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
    });

    return { authUserId };
  }

  async updateCredentialUser(input: UpdateAuthCredentialInput): Promise<void> {
    const data: {
      name?: string;
      email?: string;
      role?: string;
      erpUserId?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.email !== undefined) {
      data.email = input.email.trim().toLowerCase();
    }

    if (input.role !== undefined) {
      data.role = input.role;
    }

    if (input.erpUserId !== undefined) {
      data.erpUserId = input.erpUserId;
    }

    await this.prisma.authUser.update({
      where: { id: input.authUserId },
      data,
    });
  }

  async resetCredentialPassword(
    input: ResetAuthCredentialPasswordInput,
  ): Promise<void> {
    const passwordHash = await hashPassword(input.password);
    const account = await this.prisma.authAccount.findFirst({
      where: {
        userId: input.authUserId,
        providerId: "credential",
      },
    });

    if (account === null) {
      throw new Error("Credential account not found for user");
    }

    await this.prisma.authAccount.update({
      where: { id: account.id },
      data: {
        password: passwordHash,
        updatedAt: new Date(),
      },
    });
  }

  async revokeSessions(authUserId: string): Promise<void> {
    await this.prisma.authSession.deleteMany({
      where: { userId: authUserId },
    });
  }
}
