import { prisma } from "@splitfare/db";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

let userCounter = 0;

/**
 * Creates a real user in the test DB.
 * Generates unique values by default so tests don't collide.
 */
export async function createTestUser(overrides: {
  googleId?: string;
  email?: string;
  name?: string;
} = {}) {
  const n = ++userCounter;
  return prisma.user.create({
    data: {
      googleId: overrides.googleId ?? `google-test-${n}`,
      email: overrides.email ?? `user${n}@test.com`,
      name: overrides.name ?? `Test User ${n}`,
    },
  });
}

/**
 * Returns a cookie header string containing a valid JWT for the given user.
 * Pass this as the `Cookie` header in supertest requests.
 */
export function authCookie(userId: string, email: string): string {
  const token = jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: "1h" });
  return `token=${token}`;
}

/**
 * Creates a user and returns both the user and their auth cookie in one call.
 */
export async function createAuthedUser(overrides: Parameters<typeof createTestUser>[0] = {}) {
  const user = await createTestUser(overrides);
  const cookie = authCookie(user.id, user.email);
  return { user, cookie };
}
