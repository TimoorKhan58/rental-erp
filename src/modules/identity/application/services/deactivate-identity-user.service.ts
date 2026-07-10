import type { IdentityUserIdParamInput } from "../schemas/identity-user.schemas";
import { IdentityUserIdParamSchema } from "../schemas/identity-user.schemas";
import { toIdentityUserAuditValues } from "./identity-audit.mapper";
import {
  IDENTITY_MODULE,
  IDENTITY_USER_ENTITY_NAME,
} from "./identity-service.constants";
import type { IIdentityTransactionRunner } from "./identity-transaction.runner";
import type { UserId } from "@/shared/domain/ids";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError, UnprocessableError } from "@/shared/infrastructure/errors";
import { IdentityUserStateError } from "@/modules/identity/domain/identity-user.errors";
import { assertCanDeactivateUser } from "@/modules/identity/domain/identity-user.rules";
import { USER_ROLES } from "@/constants/roles";

export class DeactivateIdentityUserService {
  constructor(
    private readonly transactionRunner: IIdentityTransactionRunner,
  ) {}

  async execute(params: IdentityUserIdParamInput): Promise<void> {
    const { id } = parseRequest(IdentityUserIdParamSchema, params);

    await this.transactionRunner.run(async (scope) => {
      const existing = await scope.userRepository.findById(id as UserId);

      if (existing === null) {
        throw new NotFoundError({
          message: "User not found",
          details: { id },
        });
      }

      if (!existing.isActive) {
        return;
      }

      const activeOwnerCount = await scope.userRepository.countActiveByRole(
        USER_ROLES.OWNER,
      );

      try {
        assertCanDeactivateUser({
          targetUserId: existing.id,
          actorUserId: scope.actorUserId ?? "",
          targetRole: existing.roleName,
          activeOwnerCount,
        });
      } catch (error) {
        if (error instanceof IdentityUserStateError) {
          throw new UnprocessableError({ message: error.message });
        }

        throw error;
      }

      const updated = await scope.userRepository.update(id as UserId, { isActive: false });

      if (existing.authUserId !== null) {
        await scope.authGateway.revokeSessions(existing.authUserId);
      }

      await scope.auditLogger.log({
        module: IDENTITY_MODULE,
        entityName: IDENTITY_USER_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: toIdentityUserAuditValues(existing),
        newValues: toIdentityUserAuditValues(updated),
      });
    });
  }
}
