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
import { NotFoundError, UnprocessableError } from "@/shared/infrastructure/errors";

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
