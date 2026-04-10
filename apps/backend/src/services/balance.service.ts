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

  // Positive = is owed money, Negative = owes money
  const netMap = new Map<string, number>();

  for (const expense of expenses) {
    // Payer is owed the total minus their own share
    for (const split of expense.splits) {
      if (split.userId === expense.paidBy) {
        // Payer's net goes up by (expense total - their share)
        const current = netMap.get(expense.paidBy) ?? 0;
        netMap.set(expense.paidBy, current + (expense.amount - split.amount));
      } else {
        // Others owe their share
        const payerCurrent = netMap.get(expense.paidBy) ?? 0;
        // Actually, let's recalculate: payer gets +splitAmount from each non-payer
        // Non-payer gets -splitAmount
        const ownerCurrent = netMap.get(split.userId) ?? 0;
        netMap.set(split.userId, ownerCurrent - split.amount);
        netMap.set(expense.paidBy, payerCurrent + split.amount);
      }
    }

    // Subtract payer's own split from payer's credit (they don't owe themselves)
    const payerSplit = expense.splits.find((s) => s.userId === expense.paidBy);
    if (payerSplit) {
      const current = netMap.get(expense.paidBy) ?? 0;
      netMap.set(expense.paidBy, current - payerSplit.amount);
    }
  }

  // Factor in settlements
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
  });

  for (const s of settlements) {
    const fromCurrent = netMap.get(s.fromUser) ?? 0;
    const toCurrent = netMap.get(s.toUser) ?? 0;
    netMap.set(s.fromUser, fromCurrent + s.amount);
    netMap.set(s.toUser, toCurrent - s.amount);
  }

  const balances: Balance[] = Array.from(netMap.entries()).map(
    ([userId, amount]) => ({
      userId,
      amount: Math.round(amount * 100) / 100,
    })
  );

  const transactions = simplifyDebts(balances);

  return { balances, transactions };
}
