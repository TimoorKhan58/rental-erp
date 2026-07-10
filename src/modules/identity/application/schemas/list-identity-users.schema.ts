import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import { USER_ROLE_LIST } from "@/constants/roles";
import { IDENTITY_USER_SORT_FIELDS } from "@/modules/identity/domain/identity-user.constants";

export const ListIdentityUsersSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  role: z.enum(USER_ROLE_LIST).optional(),
  sortBy: z.enum(IDENTITY_USER_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListIdentityUsersInput = z.infer<typeof ListIdentityUsersSchema>;
