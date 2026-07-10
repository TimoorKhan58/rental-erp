import type { IdentityUserDto } from "../dtos/identity-user.dto";
import { toIdentityUserDto } from "../mappers/identity-user.mapper";
import {
  IdentityUserIdParamSchema,
  UpdateIdentityUserSchema,
  type IdentityUserIdParamInput,
  type UpdateIdentityUserInput,
} from "../schemas/identity-user.schemas";
import { toIdentityUserAuditValues } from "./identity-audit.mapper";
import {
  IDENTITY_MODULE,
  IDENTITY_USER_ENTITY_NAME,
} from "./identity-service.constants";
import type { IIdentityTransactionRunner } from "./identity-transaction.runner";
import type { UserId } from "@/shared/domain/ids";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import {
  IdentityUserInvariantError,
  IdentityUserStateError,
} from "@/modules/identity/domain/identity-user.errors";
import { assertCanDeactivateUser } from "@/modules/identity/domain/identity-user.rules";
import { USER_ROLES } from "@/constants/roles";

export class UpdateIdentityUserService {
  constructor(
    private readonly transactionRunner: IIdentityTransactionRunner,
  ) {}

  async execute(
    params: IdentityUserIdParamInput,
    input: UpdateIdentityUserInput,
  ): Promise<IdentityUserDto> {
    const { id } = parseRequest(IdentityUserIdParamSchema, params);
    const data = parseRequest(UpdateIdentityUserSchema, input);

    return this.transactionRunner.run(async (scope) => {
      const existing = await scope.userRepository.findById(id as UserId);

      if (existing === null) {
        throw new NotFoundError({
          message: "User not found",
          details: { id },
        });
      }

      if (data.email !== undefined && data.email !== existing.email) {
        const emailOwner = await scope.userRepository.findByEmail(data.email);

        if (emailOwner !== null && emailOwner.id !== existing.id) {
          throw new ConflictError({
            message: "Email already exists",
            details: { email: data.email },
          });
        }
      }

      let roleId = existing.roleId;
      let roleName = existing.roleName;

      if (data.role !== undefined) {
        const role = await scope.roleRepository.findByName(data.role);

        if (role === null) {
          throw new NotFoundError({
            message: "Role not found",
            details: { role: data.role },
          });
        }

        roleId = role.id;
        roleName = role.name;
      }

      if (data.isActive === false && existing.isActive) {
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
      }

      let updated;

      try {
        updated = await scope.userRepository.update(id as UserId, {
          name: data.name,
          email: data.email,
          roleId,
          roleName,
          isActive: data.isActive,
        });
      } catch (error) {
        if (error instanceof IdentityUserInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: error.field ? { field: error.field } : undefined,
          });
        }

        throw error;
      }

      if (existing.authUserId !== null) {
        await scope.authGateway.updateCredentialUser({
          authUserId: existing.authUserId,
          email: data.email,
          name: data.name,
          role: data.role,
          erpUserId: updated.id,
        });

        if (data.isActive === false) {
          await scope.authGateway.revokeSessions(existing.authUserId);
        }
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

      return toIdentityUserDto(updated);
    });
  }
}
