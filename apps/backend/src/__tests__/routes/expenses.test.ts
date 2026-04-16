import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@splitfare/db";
import app from "../../app.js";
import { cleanDb } from "../helpers/db.js";
import { createAuthedUser, createTestUser } from "../helpers/auth.js";

beforeEach(async () => {
  await cleanDb();
});

// Helper: create a group with the given members already joined
async function createGroupWithMembers(
  ownerId: string,
  extraMemberIds: string[] = []
) {
  return prisma.group.create({
    data: {
      name: "Expense Group",
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

describe("POST /expenses", () => {
  it("creates an expense and splits it equally among all members", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const carol = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id, carol.id]);

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", cookie)
      .send({
        groupId: group.id,
        amount: 90,
        description: "Dinner",
        splitType: "EQUAL",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(90);
    expect(res.body.data.description).toBe("Dinner");
    expect(res.body.data.splits).toHaveLength(3);

    const total = res.body.data.splits.reduce(
      (sum: number, s: { amount: number }) => sum + s.amount,
      0
    );
    expect(Math.round(total * 100) / 100).toBe(90);

    // Each split should be 30
    for (const split of res.body.data.splits) {
      expect(split.amount).toBe(30);
    }
  });

  it("distributes remainder cents correctly for uneven splits", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const carol = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id, carol.id]);

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", cookie)
      .send({
        groupId: group.id,
        amount: 10, // $10 / 3 = $3.33...
        description: "Coffee",
        splitType: "EQUAL",
      });

    expect(res.status).toBe(201);
    const amounts = res.body.data.splits
      .map((s: { amount: number }) => s.amount)
      .sort((a: number, b: number) => b - a);
    expect(amounts[0]).toBe(3.34); // remainder cent goes to first
    expect(amounts[1]).toBe(3.33);
    expect(amounts[2]).toBe(3.33);
  });

  it("splits only among explicit participants when provided", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const carol = await createTestUser(); // in group but not in this expense
    const group = await createGroupWithMembers(alice.id, [bob.id, carol.id]);

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", cookie)
      .send({
        groupId: group.id,
        amount: 60,
        description: "Alice pays for self and Bob",
        splitType: "EQUAL",
        participants: [alice.id, bob.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.splits).toHaveLength(2);
    const userIds = res.body.data.splits.map((s: { userId: string }) => s.userId);
    expect(userIds).toContain(alice.id);
    expect(userIds).toContain(bob.id);
    expect(userIds).not.toContain(carol.id);
  });

  it("sets settled to false on all splits by default", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", cookie)
      .send({ groupId: group.id, amount: 50, description: "Lunch", splitType: "EQUAL" });

    expect(res.status).toBe(201);
    for (const split of res.body.data.splits) {
      expect(split.settled).toBe(false);
    }
  });

  it("returns 403 when the payer is not a group member", async () => {
    const { user: owner } = await createAuthedUser();
    const { cookie: outsiderCookie } = await createAuthedUser();
    const group = await createGroupWithMembers(owner.id);

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", outsiderCookie)
      .send({ groupId: group.id, amount: 50, description: "Snacks", splitType: "EQUAL" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when amount is zero", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const group = await createGroupWithMembers(alice.id);

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", cookie)
      .send({ groupId: group.id, amount: 0, description: "Nothing", splitType: "EQUAL" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is negative", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const group = await createGroupWithMembers(alice.id);

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", cookie)
      .send({ groupId: group.id, amount: -20, description: "Negative", splitType: "EQUAL" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when description is missing", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const group = await createGroupWithMembers(alice.id);

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", cookie)
      .send({ groupId: group.id, amount: 50, splitType: "EQUAL" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when groupId is not a valid UUID", async () => {
    const { cookie } = await createAuthedUser();

    const res = await request(app)
      .post("/expenses")
      .set("Cookie", cookie)
      .send({ groupId: "not-a-uuid", amount: 50, description: "Test", splitType: "EQUAL" });

    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/expenses")
      .send({ groupId: "any", amount: 10, description: "x", splitType: "EQUAL" });
    expect(res.status).toBe(401);
  });
});

describe("GET /groups/:id/expenses", () => {
  it("returns all expenses for the group in descending order", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    // Create two expenses
    await prisma.expense.create({
      data: {
        groupId: group.id,
        paidBy: alice.id,
        amount: 30,
        description: "First",
        splitType: "EQUAL",
        splits: {
          create: [
            { userId: alice.id, amount: 15 },
            { userId: bob.id, amount: 15 },
          ],
        },
      },
    });
    await prisma.expense.create({
      data: {
        groupId: group.id,
        paidBy: bob.id,
        amount: 60,
        description: "Second",
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
      .get(`/groups/${group.id}/expenses`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Should be ordered newest first
    expect(res.body.data[0].description).toBe("Second");
    expect(res.body.data[1].description).toBe("First");
  });

  it("returns empty array when group has no expenses", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const group = await createGroupWithMembers(alice.id);

    const res = await request(app)
      .get(`/groups/${group.id}/expenses`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 403 when requester is not a group member", async () => {
    const { user: owner } = await createAuthedUser();
    const { cookie: outsiderCookie } = await createAuthedUser();
    const group = await createGroupWithMembers(owner.id);

    const res = await request(app)
      .get(`/groups/${group.id}/expenses`)
      .set("Cookie", outsiderCookie);

    expect(res.status).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/groups/any-id/expenses");
    expect(res.status).toBe(401);
  });
});
