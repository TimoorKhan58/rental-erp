import type { IdentityUserDto } from "../dtos/identity-user.dto";
import { toIdentityUserDto } from "../mappers/identity-user.mapper";
import {
  IdentityUserIdParamSchema,
  ResetIdentityUserPasswordSchema,
  type IdentityUserIdParamInput,
  type ResetIdentityUserPasswordInput,
} from "../schemas/identity-user.schemas";
import { toIdentityUserAuditValues } from "./identity-audit.mapper";
import {
  IDENTITY_MODULE,
  IDENTITY_USER_ENTITY_NAME,
} from "./identity-service.constants";
import type { IIdentityTransactionRunner } from "./identity-transaction.runner";
import type { UserId } from "@/shared/domain/ids";
import { parseRequest } from "@/shared/application/validation";
import { isUserRole } from "@/shared/application/authorization/types";
import {
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { IdentityUserStateError } from "@/modules/identity/domain/identity-user.errors";
import { assertCanResetUserPassword } from "@/modules/identity/domain/identity-user.rules";

export class ResetIdentityUserPasswordService {
  constructor(
    private readonly transactionRunner: IIdentityTransactionRunner,
  ) {}

  async execute(
    params: IdentityUserIdParamInput,
    input: ResetIdentityUserPasswordInput,
  ): Promise<IdentityUserDto> {
    const { id } = parseRequest(IdentityUserIdParamSchema, params);
    const data = parseRequest(ResetIdentityUserPasswordSchema, input);

    return this.transactionRunner.run(async (scope) => {
      const existing = await scope.userRepository.findById(id as UserId);

      if (existing === null) {
        throw new NotFoundError({
          message: "User not found",
          details: { id },
        });
      }

      if (scope.actorRole === undefined || !isUserRole(scope.actorRole)) {
        throw new ForbiddenError({
          message: "Authenticated actor role is required to reset passwords",
        });
      }

      try {
        assertCanResetUserPassword({
          actorRole: scope.actorRole,
          targetRole: existing.roleName,
        });
      } catch (error) {
        if (error instanceof IdentityUserStateError) {
          throw new ForbiddenError({ message: error.message });
        }

        throw error;
      }

      if (existing.authUserId === null) {
        throw new UnprocessableError({
          message: "User has no linked authentication account",
          details: { id },
        });
      }

      await scope.authGateway.resetCredentialPassword({
        authUserId: existing.authUserId,
        password: data.password,
      });

      await scope.authGateway.revokeSessions(existing.authUserId);

      await scope.auditLogger.log({
        module: IDENTITY_MODULE,
        entityName: IDENTITY_USER_ENTITY_NAME,
        recordId: existing.id,
        action: "PASSWORD_RESET",
        status: "SUCCESS",
        oldValues: { passwordReset: false },
        newValues: toIdentityUserAuditValues(existing),
      });

      return toIdentityUserDto(existing);
    });
  }
}
