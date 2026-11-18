import type { NextRequest } from "next/server";
import { APIError } from "better-auth/api";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { parseRequest } from "@/shared/application/validation";
import { PasswordSchema } from "@/shared/application/validation/common-schemas";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { successResponse } from "@/shared/infrastructure/http/api-response";
import {
  authenticateApiRequest,
  runInRequestOrganization,
} from "@/shared/infrastructure/http/authenticate-api-request";
import { runCatchingApiHandler } from "@/shared/infrastructure/http/run-catching-api-handler";
import { toJsonResponse } from "@/shared/infrastructure/http/to-json-response";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: PasswordSchema,
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });

/**
 * The signed-in user changes their own password (SaaS phase 3c). Also the
 * only API open to a user who still has a temporary password; success
 * clears that requirement.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const { ctx, requestId } = await authenticateApiRequest(request, "/api/account/password", "POST");
    const body = parseRequest(ChangePasswordSchema, await request.json().catch(() => ({})));

    try {
      await auth.api.changePassword({
        body: {
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
          revokeOtherSessions: false,
        },
        headers: request.headers,
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw new UnprocessableError({
          message:
            error.body?.code === "INVALID_PASSWORD"
              ? "Your current password is incorrect."
              : (error.body?.message ?? "Could not change the password."),
        });
      }
      throw error;
    }

    await runInRequestOrganization(ctx, () =>
      prisma.user.update({
        where: { id: ctx.request.userId as string },
        data: { mustChangePassword: false },
        select: { id: true },
      }),
    );

    return toJsonResponse({ status: 200, body: successResponse({ changed: true }, requestId) });
  });
}
