import { prisma } from "@splitfare/db";
import { simplifyDebts } from "@splitfare/utils";
import type { Balance } from "@splitfare/types";
import { AppError } from "../config/app-error.js";

export async function getGroupBalances(groupId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    throw new AppError("FORBIDDEN", "You are not a member of this group", 403);
  }

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: { where: { settled: false } } },
  });

  // Positive = is owed money (creditor), Negative = owes money (debtor)
  const netMap = new Map<string, number>();

  for (const expense of expenses) {
    // Payer gets full credit for the amount they paid
    const payerCurrent = netMap.get(expense.paidBy) ?? 0;
    netMap.set(expense.paidBy, payerCurrent + expense.amount);

    // Everyone owes their share (including the payer — cancels out their own credit)
    for (const split of expense.splits) {
      const current = netMap.get(split.userId) ?? 0;
      netMap.set(split.userId, current - split.amount);
    }
  }

  // Factor in settlements: settler's debt reduces, receiver's credit reduces
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
  });

  for (const s of settlements) {
    const fromCurrent = netMap.get(s.fromUser) ?? 0;
    const toCurrent = netMap.get(s.toUser) ?? 0;
    netMap.set(s.fromUser, fromCurrent + s.amount);
    netMap.set(s.toUser, toCurrent - s.amount);
  }

  const members = await prisma.membership.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });
  const nameMap = new Map(members.map((m) => [m.user.id, m.user.name]));

  const balances: Balance[] = Array.from(netMap.entries()).map(
    ([uid, amount]) => ({
      userId: uid,
      amount: Math.round(amount * 100) / 100,
    })
  );

  const transactions = simplifyDebts(balances);

  return {
    balances: balances.map((b) => ({
      ...b,
      userName: nameMap.get(b.userId) ?? "Unknown",
    })),
    transactions: transactions.map((t) => ({
      ...t,
      fromName: nameMap.get(t.from) ?? "Unknown",
      toName: nameMap.get(t.to) ?? "Unknown",
    })),
  };
}
