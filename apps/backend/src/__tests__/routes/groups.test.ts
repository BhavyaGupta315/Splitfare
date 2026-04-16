import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@splitfare/db";
import app from "../../app.js";
import { cleanDb } from "../helpers/db.js";
import { createAuthedUser, createTestUser, authCookie } from "../helpers/auth.js";

beforeEach(async () => {
  await cleanDb();
});

describe("POST /groups", () => {
  it("creates a group and auto-adds the creator as member", async () => {
    const { user, cookie } = await createAuthedUser();

    const res = await request(app)
      .post("/groups")
      .set("Cookie", cookie)
      .send({ name: "Trip to Goa" });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Trip to Goa");
    expect(res.body.data.createdBy).toBe(user.id);
    expect(res.body.data.members).toHaveLength(1);
    expect(res.body.data.members[0].userId).toBe(user.id);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/groups")
      .send({ name: "No Auth Group" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when name is empty", async () => {
    const { cookie } = await createAuthedUser();

    const res = await request(app)
      .post("/groups")
      .set("Cookie", cookie)
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when name is missing", async () => {
    const { cookie } = await createAuthedUser();

    const res = await request(app)
      .post("/groups")
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 401 with an invalid JWT", async () => {
    const res = await request(app)
      .post("/groups")
      .set("Cookie", "token=not-a-real-jwt")
      .send({ name: "Ghost Group" });

    expect(res.status).toBe(401);
  });
});

describe("GET /groups/:id", () => {
  it("returns group with members when requester is a member", async () => {
    const { user, cookie } = await createAuthedUser();
    const group = await prisma.group.create({
      data: {
        name: "Test Group",
        createdBy: user.id,
        members: { create: { userId: user.id } },
      },
    });

    const res = await request(app)
      .get(`/groups/${group.id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(group.id);
    expect(res.body.data.name).toBe("Test Group");
    expect(res.body.data.members).toHaveLength(1);
  });

  it("returns 403 when requester is not a member", async () => {
    const { user: owner } = await createAuthedUser();
    const { cookie: outsiderCookie } = await createAuthedUser();

    const group = await prisma.group.create({
      data: {
        name: "Private Group",
        createdBy: owner.id,
        members: { create: { userId: owner.id } },
      },
    });

    const res = await request(app)
      .get(`/groups/${group.id}`)
      .set("Cookie", outsiderCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for a non-existent group", async () => {
    const { cookie } = await createAuthedUser();

    const res = await request(app)
      .get("/groups/00000000-0000-0000-0000-000000000000")
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/groups/any-id");
    expect(res.status).toBe(401);
  });
});

describe("POST /groups/:id/members", () => {
  it("adds a user by email and returns membership", async () => {
    const { user: owner, cookie } = await createAuthedUser();
    const newMember = await createTestUser({ email: "newmember@test.com" });

    const group = await prisma.group.create({
      data: {
        name: "Add Member Group",
        createdBy: owner.id,
        members: { create: { userId: owner.id } },
      },
    });

    const res = await request(app)
      .post(`/groups/${group.id}/members`)
      .set("Cookie", cookie)
      .send({ email: "newmember@test.com" });

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(newMember.id);
    expect(res.body.data.groupId).toBe(group.id);
  });

  it("returns 404 when the invited email is not registered", async () => {
    const { user: owner, cookie } = await createAuthedUser();
    const group = await prisma.group.create({
      data: {
        name: "Group",
        createdBy: owner.id,
        members: { create: { userId: owner.id } },
      },
    });

    const res = await request(app)
      .post(`/groups/${group.id}/members`)
      .set("Cookie", cookie)
      .send({ email: "ghost@nowhere.com" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when the user is already a member", async () => {
    const { user: owner, cookie } = await createAuthedUser();
    const dup = await createTestUser({ email: "dup@test.com" });

    const group = await prisma.group.create({
      data: {
        name: "Dup Group",
        createdBy: owner.id,
        members: {
          create: [{ userId: owner.id }, { userId: dup.id }],
        },
      },
    });

    const res = await request(app)
      .post(`/groups/${group.id}/members`)
      .set("Cookie", cookie)
      .send({ email: "dup@test.com" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 403 when requester is not a member of the group", async () => {
    const { user: owner } = await createAuthedUser();
    const { cookie: outsiderCookie } = await createAuthedUser();
    const target = await createTestUser({ email: "target@test.com" });

    const group = await prisma.group.create({
      data: {
        name: "Group",
        createdBy: owner.id,
        members: { create: { userId: owner.id } },
      },
    });

    const res = await request(app)
      .post(`/groups/${group.id}/members`)
      .set("Cookie", outsiderCookie)
      .send({ email: target.email });

    expect(res.status).toBe(403);
  });

  it("returns 400 when email is invalid format", async () => {
    const { user: owner, cookie } = await createAuthedUser();
    const group = await prisma.group.create({
      data: {
        name: "Group",
        createdBy: owner.id,
        members: { create: { userId: owner.id } },
      },
    });

    const res = await request(app)
      .post(`/groups/${group.id}/members`)
      .set("Cookie", cookie)
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/groups/any-id/members")
      .send({ email: "someone@test.com" });
    expect(res.status).toBe(401);
  });
});
