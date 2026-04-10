import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "@splitfare/db";
import { env } from "../config/env.js";
import { AppError } from "../config/app-error.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(idToken: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new AppError("AUTH_FAILED", "Invalid Google token payload", 401);
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("AUTH_FAILED", "Google token verification failed", 401);
  }
}

export async function upsertUser(profile: {
  googleId: string;
  email: string;
  name: string;
}) {
  return prisma.user.upsert({
    where: { googleId: profile.googleId },
    update: { name: profile.name },
    create: {
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
    },
  });
}

export function issueJwt(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: "7d" });
}
