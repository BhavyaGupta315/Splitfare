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
      name: "Balance Group",
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

async function addExpense({
  groupId,
  paidBy,
  amount,
  description = "Expense",
  splits,
}: {
  groupId: string;
  paidBy: string;
  amount: number;
  description?: string;
  splits: { userId: string; amount: number }[];
}) {
  return prisma.expense.create({
    data: {
      groupId,
      paidBy,
      amount,
      description,
      splitType: "EQUAL",
      splits: { create: splits },
    },
  });
}

describe("GET /groups/:id/balances", () => {
  it("returns empty balances when group has no expenses", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const group = await createGroupWithMembers(alice.id);

    const res = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.balances).toEqual([]);
    expect(res.body.data.transactions).toEqual([]);
  });

  it("calculates correct net balances for a single expense", async () => {
    // Alice pays $90 for 3 people — each owes $30
    // Alice net = +60 (paid 90, owes 30)
    // Bob net   = -30
    // Carol net = -30
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const carol = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id, carol.id]);

    await addExpense({
      groupId: group.id,
      paidBy: alice.id,
      amount: 90,
      splits: [
        { userId: alice.id, amount: 30 },
        { userId: bob.id, amount: 30 },
        { userId: carol.id, amount: 30 },
      ],
    });

    const res = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);

    const { balances, transactions } = res.body.data;
    const byUser = Object.fromEntries(
      balances.map((b: { userId: string; amount: number }) => [b.userId, b.amount])
    );

    expect(byUser[alice.id]).toBe(60);
    expect(byUser[bob.id]).toBe(-30);
    expect(byUser[carol.id]).toBe(-30);

    // Sum of all balances must be 0
    const total = balances.reduce(
      (sum: number, b: { amount: number }) => sum + b.amount,
      0
    );
    expect(Math.round(total * 100) / 100).toBe(0);

    // Simplified: bob→alice $30, carol→alice $30
    expect(transactions).toHaveLength(2);
    for (const t of transactions) {
      expect(t.to).toBe(alice.id);
      expect(t.amount).toBe(30);
    }
  });

  it("calculates correct balances for multiple expenses by different payers", async () => {
    // Alice pays $60 for Alice+Bob → Bob owes Alice $30
    // Bob pays $40 for Alice+Bob  → Alice owes Bob $20
    // Net: Alice = +30 - 20 = +10; Bob = -30 + 20 = -10
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    await addExpense({
      groupId: group.id,
      paidBy: alice.id,
      amount: 60,
      splits: [
        { userId: alice.id, amount: 30 },
        { userId: bob.id, amount: 30 },
      ],
    });
    await addExpense({
      groupId: group.id,
      paidBy: bob.id,
      amount: 40,
      splits: [
        { userId: alice.id, amount: 20 },
        { userId: bob.id, amount: 20 },
      ],
    });

    const res = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    const { balances, transactions } = res.body.data;
    const byUser = Object.fromEntries(
      balances.map((b: { userId: string; amount: number }) => [b.userId, b.amount])
    );

    expect(byUser[alice.id]).toBe(10);
    expect(byUser[bob.id]).toBe(-10);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ from: bob.id, to: alice.id, amount: 10 });
  });

  it("balances sum to zero regardless of number of expenses", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const carol = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id, carol.id]);

    // Several expenses
    await addExpense({
      groupId: group.id, paidBy: alice.id, amount: 99,
      splits: [
        { userId: alice.id, amount: 33 },
        { userId: bob.id, amount: 33 },
        { userId: carol.id, amount: 33 },
      ],
    });
    await addExpense({
      groupId: group.id, paidBy: bob.id, amount: 50,
      splits: [
        { userId: alice.id, amount: 25 },
        { userId: bob.id, amount: 25 },
      ],
    });
    await addExpense({
      groupId: group.id, paidBy: carol.id, amount: 20,
      splits: [
        { userId: alice.id, amount: 10 },
        { userId: carol.id, amount: 10 },
      ],
    });

    const res = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    const total = res.body.data.balances.reduce(
      (sum: number, b: { amount: number }) => sum + b.amount,
      0
    );
    expect(Math.round(total * 100) / 100).toBe(0);
  });

  it("ignores already-settled splits in balance calculation", async () => {
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    const expense = await addExpense({
      groupId: group.id,
      paidBy: alice.id,
      amount: 100,
      splits: [
        { userId: alice.id, amount: 50 },
        { userId: bob.id, amount: 50 },
      ],
    });

    // Mark Bob's split as settled
    await prisma.expenseSplit.updateMany({
      where: { expenseId: expense.id, userId: bob.id },
      data: { settled: true },
    });

    const res = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    const balances = res.body.data.balances;

    // Only Alice's unsettled split remains: Alice paid 100, owes 50 → net +50
    // Bob's split is settled, so not counted → net 0 (not in map or 0)
    const byUser = Object.fromEntries(
      balances.map((b: { userId: string; amount: number }) => [b.userId, b.amount])
    );
    expect(byUser[alice.id]).toBe(50);
    // Bob either has 0 or isn't in the map
    expect(byUser[bob.id] ?? 0).toBe(0);
  });

  it("reflects settlements in the balance", async () => {
    // Alice owes Bob $30, then settles $30 → net zero
    const { user: alice, cookie } = await createAuthedUser();
    const bob = await createTestUser();
    const group = await createGroupWithMembers(alice.id, [bob.id]);

    await addExpense({
      groupId: group.id,
      paidBy: bob.id,
      amount: 60,
      splits: [
        { userId: alice.id, amount: 30 },
        { userId: bob.id, amount: 30 },
      ],
    });

    // Record settlement: Alice pays Bob $30
    await prisma.settlement.create({
      data: {
        groupId: group.id,
        fromUser: alice.id,
        toUser: bob.id,
        amount: 30,
      },
    });

    const res = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    const total = res.body.data.balances.reduce(
      (sum: number, b: { amount: number }) => sum + b.amount,
      0
    );
    expect(Math.round(total * 100) / 100).toBe(0);
    // After settlement, no transactions needed
    expect(res.body.data.transactions).toHaveLength(0);
  });

  it("returns 403 when requester is not a group member", async () => {
    const { user: owner } = await createAuthedUser();
    const { cookie: outsiderCookie } = await createAuthedUser();
    const group = await createGroupWithMembers(owner.id);

    const res = await request(app)
      .get(`/groups/${group.id}/balances`)
      .set("Cookie", outsiderCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/groups/any-id/balances");
    expect(res.status).toBe(401);
  });
});
