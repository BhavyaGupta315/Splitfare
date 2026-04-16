import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { prisma } from "@splitfare/db";
import app from "../../app.js";
import { cleanDb } from "../helpers/db.js";
import * as authService from "../../services/auth.service.js";
import { AppError } from "../../config/app-error.js";

beforeEach(async () => {
  await cleanDb();
});

describe("POST /auth/google", () => {
  it("returns 200, sets cookie, and returns user on valid token", async () => {
    vi.spyOn(authService, "verifyGoogleToken").mockResolvedValue({
      googleId: "google-abc",
      email: "alice@example.com",
      name: "Alice",
    });

    const res = await request(app)
      .post("/auth/google")
      .send({ idToken: "mock-valid-token" });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      email: "alice@example.com",
      name: "Alice",
    });
    expect(res.body.data.user.id).toBeDefined();
    // Cookie should be set
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("token=");
    expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
  });

  it("creates a new user in the DB on first sign-in", async () => {
    vi.spyOn(authService, "verifyGoogleToken").mockResolvedValue({
      googleId: "google-new",
      email: "new@example.com",
      name: "New User",
    });

    await request(app)
      .post("/auth/google")
      .send({ idToken: "mock-token" });

    const user = await prisma.user.findUnique({ where: { email: "new@example.com" } });
    expect(user).not.toBeNull();
    expect(user!.googleId).toBe("google-new");
  });

  it("upserts (does not duplicate) on repeated sign-in with same Google ID", async () => {
    vi.spyOn(authService, "verifyGoogleToken").mockResolvedValue({
      googleId: "google-repeat",
      email: "repeat@example.com",
      name: "Repeat User",
    });

    await request(app).post("/auth/google").send({ idToken: "t1" });
    await request(app).post("/auth/google").send({ idToken: "t2" });

    const users = await prisma.user.findMany({ where: { email: "repeat@example.com" } });
    expect(users).toHaveLength(1);
  });

  it("updates user name on subsequent sign-in", async () => {
    vi.spyOn(authService, "verifyGoogleToken").mockResolvedValueOnce({
      googleId: "google-rename",
      email: "rename@example.com",
      name: "Old Name",
    });

    await request(app).post("/auth/google").send({ idToken: "t1" });

    vi.spyOn(authService, "verifyGoogleToken").mockResolvedValueOnce({
      googleId: "google-rename",
      email: "rename@example.com",
      name: "New Name",
    });

    await request(app).post("/auth/google").send({ idToken: "t2" });

    const user = await prisma.user.findUnique({ where: { email: "rename@example.com" } });
    expect(user!.name).toBe("New Name");
  });

  it("returns 401 when Google token verification fails", async () => {
    vi.spyOn(authService, "verifyGoogleToken").mockRejectedValue(
      new AppError("AUTH_FAILED", "Google token verification failed", 401)
    );

    const res = await request(app)
      .post("/auth/google")
      .send({ idToken: "bad-token" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when idToken is missing from body", async () => {
    const res = await request(app)
      .post("/auth/google")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when idToken is empty string", async () => {
    const res = await request(app)
      .post("/auth/google")
      .send({ idToken: "" });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/logout", () => {
  it("returns 200 and clears the cookie", async () => {
    const res = await request(app).post("/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe("Logged out");
    // Cookie should be cleared (expires in the past or empty value)
    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toContain("token=");
  });
});
