import { USER_ROLES, type UserRole } from "@/constants/roles";

export const TEST_ERP_USER_ID = "00000000-0000-4000-8000-000000000099";
export const TEST_AUTH_USER_ID = "auth-user-test-1";

export function createMockAuthSession(role: UserRole = USER_ROLES.OWNER) {
  return {
    user: {
      id: TEST_AUTH_USER_ID,
      erpUserId: TEST_ERP_USER_ID,
      role,
      name: "Test User",
      email: "test@example.com",
    },
    session: {
      id: "session-1",
      expiresAt: new Date(),
    },
  };
}
