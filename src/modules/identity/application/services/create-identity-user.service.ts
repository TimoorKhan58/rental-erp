import type { CreateIdentityUserResultDto } from "../dtos/identity-user.dto";
import {
  toCreateIdentityUserData,
  toIdentityUserDto,
} from "../mappers/identity-user.mapper";
import {
  CreateIdentityUserSchema,
  type CreateIdentityUserInput,
} from "../schemas/identity-user.schemas";
import { toIdentityUserAuditValues } from "./identity-audit.mapper";
import { generateProvisioningPassword } from "./generate-provisioning-password";
import {
  IDENTITY_MODULE,
  IDENTITY_USER_ENTITY_NAME,
} from "./identity-service.constants";
import type { IIdentityTransactionRunner } from "./identity-transaction.runner";
import { sendIdentityUserInvitation } from "./send-identity-user-invitation";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import {
  IdentityUserInvariantError,
  IdentityUserStateError,
} from "@/modules/identity/domain/identity-user.errors";
import { assertCanAssignRole } from "@/modules/identity/domain/identity-user.rules";
import { createAppLogger } from "@/shared/infrastructure/logging";
import { isUserRole } from "@/shared/application/authorization/types";

export class CreateIdentityUserService {
  constructor(
    private readonly transactionRunner: IIdentityTransactionRunner,
  ) {}

  async execute(
    input: CreateIdentityUserInput,
  ): Promise<CreateIdentityUserResultDto> {
    const data = parseRequest(CreateIdentityUserSchema, input);
    const sendInvitation = data.sendInvitation !== false;
    const provisioningPassword = generateProvisioningPassword();

    const userDto = await this.transactionRunner.run(async (scope) => {
      const role = await scope.roleRepository.findByName(data.role);

      if (role === null) {
        throw new NotFoundError({
          message: "Role not found",
          details: { role: data.role },
        });
      }

      if (scope.actorRole === undefined || !isUserRole(scope.actorRole)) {
        throw new ForbiddenError({
          message: "Authenticated actor role is required to create users",
        });
      }

      try {
        assertCanAssignRole({
          actorRole: scope.actorRole,
          targetRole: data.role,
        });
      } catch (error) {
        if (error instanceof IdentityUserStateError) {
          throw new ForbiddenError({ message: error.message });
        }

        throw error;
      }

      const existingEmail = await scope.userRepository.findByEmail(data.email);

      if (existingEmail !== null) {
        throw new ConflictError({
          message: "Email already exists",
          details: { email: data.email },
        });
      }

      const createData = toCreateIdentityUserData(data, role);

      let user;

      try {
        user = await scope.userRepository.create(createData);
      } catch (error) {
        if (error instanceof IdentityUserInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: error.field ? { field: error.field } : undefined,
          });
        }

        throw error;
      }

      try {
        const authResult = await scope.authGateway.createCredentialUser({
          email: user.email,
          name: user.name,
          password: provisioningPassword,
          role: user.roleName,
          erpUserId: user.id,
        });

        user = await scope.userRepository.linkAuthUser({
          userId: user.id,
          authUserId: authResult.authUserId,
        });
      } catch {
        throw new UnprocessableError({
          message: "Failed to provision authentication credentials",
          details: {
            email: data.email,
          },
        });
      }

      await scope.auditLogger.log({
        module: IDENTITY_MODULE,
        entityName: IDENTITY_USER_ENTITY_NAME,
        recordId: user.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toIdentityUserAuditValues(user),
      });

      return toIdentityUserDto(user);
    });

    let invitationDelivered = true;

    if (sendInvitation) {
      try {
        await sendIdentityUserInvitation(userDto.email);
        invitationDelivered = true;
      } catch (error) {
        invitationDelivered = false;
        const logger = createAppLogger({
          bindings: { component: "create-identity-user" },
        });
        logger.error(
          "User created but invitation email failed; use Forgot password or admin reset",
          error,
          { emailDomain: userDto.email.split("@")[1] ?? "unknown" },
        );
      }
    }

    return {
      ...userDto,
      invitationDelivered,
    };
  }
}
