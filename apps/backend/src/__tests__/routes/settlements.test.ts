import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@splitfare/db";
import app from "../../app.js";
import { cleanDb } from "../helpers/db.js";
import { createAuthedUser, createTestUser } from "../helpers/auth.js";

beforeEach(async () => {
  await cleanDb();
});

async function createGroupWithMembers(
  ownerId: string,
  extraMemberIds: string[] = []
) {
  return prisma.group.create({
    data: {
      name: "Settle Group",
      createdBy: ownerId,
      members: {
        create: [
          { userId: ownerId },
          ...extraMemberIds.map((id) => ({ userId: id })),
        ],
      },
    },
  });
}

describe("POST /groups/:id/settlements", () => {
  it("creates a settlement and reduces the recorded debt", async () => {
    const { user: alice, cookie: aliceCookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    // Bob pays 60 for both -> Alice owes Bob 30
    await prisma.expense.create({
      data: {
        groupId: group.id,
        paidBy: bob.id,
        amount: 60,
        description: "Dinner",
        splitType: "EQUAL",
        splits: {
          create: [
            { userId: alice.id, amount: 30 },
            { userId: bob.id, amount: 30 },
          ],
        },
      },
    });

    const res = await request(app)
      .post(`/groups/${group.id}/settlements`)
      .set("Cookie", aliceCookie)
      .send({ toUserId: bob.id, amount: 30 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      groupId: group.id,
      fromUser: alice.id,
      toUser: bob.id,
      amount: 30,
    });
    expect(res.body.data.sender).toMatchObject({ id: alice.id });
    expect(res.body.data.receiver).toMatchObject({ id: bob.id });

    const balRes = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", aliceCookie);

    expect(balRes.status).toBe(200);
    const total = balRes.body.data.balances.reduce(
      (sum: number, b: { amount: number }) => sum + b.amount,
      0
    );
    expect(Math.round(total * 100) / 100).toBe(0);
    expect(balRes.body.data.transactions).toHaveLength(0);
  });

  it("supports partial settlements that leave residual debt", async () => {
    const { user: alice, cookie: aliceCookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    await prisma.expense.create({
      data: {
        groupId: group.id,
        paidBy: bob.id,
        amount: 100,
        description: "Hotel",
        splitType: "EQUAL",
        splits: {
          create: [
            { userId: alice.id, amount: 50 },
            { userId: bob.id, amount: 50 },
          ],
        },
      },
    });

    const res = await request(app)
      .post(`/groups/${group.id}/settlements`)
      .set("Cookie", aliceCookie)
      .send({ toUserId: bob.id, amount: 20 });

    expect(res.status).toBe(201);

    const balRes = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", aliceCookie);

    expect(balRes.body.data.transactions).toHaveLength(1);
    expect(balRes.body.data.transactions[0]).toMatchObject({
      from: alice.id,
      to: bob.id,
      amount: 30,
    });
  });

  it("returns 401 when not authenticated", async () => {
    const owner = await createTestUser();
    const group = await createGroupWithMembers(owner.id);

    const res = await request(app)
      .post(`/groups/${group.id}/settlements`)
      .send({ toUserId: owner.id, amount: 5 });

    expect(res.status).toBe(401);
  });

  it("returns 403 when requester is not a group member", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const { cookie: outsiderCookie } = await createAuthedUser();
    const group = await createGroupWithMembers(owner.id, [member.id]);

    const res = await request(app)
      .post(`/groups/${group.id}/settlements`)
      .set("Cookie", outsiderCookie)
      .send({ toUserId: member.id, amount: 10 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when settling with yourself", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const group = await createGroupWithMembers(alice.id);

    const res = await request(app)
      .post(`/groups/${group.id}/settlements`)
      .set("Cookie", cookie)
      .send({ toUserId: alice.id, amount: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when recipient is not a group member", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const stranger = await createTestUser();
    const group = await createGroupWithMembers(alice.id);

    const res = await request(app)
      .post(`/groups/${group.id}/settlements`)
      .set("Cookie", cookie)
      .send({ toUserId: stranger.id, amount: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when amount is not positive", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    const res = await request(app)
      .post(`/groups/${group.id}/settlements`)
      .set("Cookie", cookie)
      .send({ toUserId: bob.id, amount: 0 });

    expect(res.status).toBe(400);
  });

  it("returns 400 when toUserId is missing", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const group = await createGroupWithMembers(alice.id);

    const res = await request(app)
      .post(`/groups/${group.id}/settlements`)
      .set("Cookie", cookie)
      .send({ amount: 10 });

    expect(res.status).toBe(400);
  });
});

describe("GET /groups/:id/settlements", () => {
  it("returns settlements for a group, newest first", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    const first = await prisma.settlement.create({
      data: { groupId: group.id, fromUser: alice.id, toUser: bob.id, amount: 5 },
    });
    await new Promise((r) => setTimeout(r, 5));
    const second = await prisma.settlement.create({
      data: { groupId: group.id, fromUser: bob.id, toUser: alice.id, amount: 7 },
    });

    const res = await request(app)
      .get(`/groups/${group.id}/settlements`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].id).toBe(second.id);
    expect(res.body.data[1].id).toBe(first.id);
    expect(res.body.data[0].sender).toMatchObject({ id: bob.id });
    expect(res.body.data[0].receiver).toMatchObject({ id: alice.id });
  });

  it("returns 403 when requester is not a group member", async () => {
    const owner = await createTestUser();
    const { cookie: outsiderCookie } = await createAuthedUser();
    const group = await createGroupWithMembers(owner.id);

    const res = await request(app)
      .get(`/groups/${group.id}/settlements`)
      .set("Cookie", outsiderCookie);

    expect(res.status).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/groups/anything/settlements");
    expect(res.status).toBe(401);
  });
});
