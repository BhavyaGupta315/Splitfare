import type { Balance, Transaction } from "@splitfare/types";

export function simplifyDebts(balances: Balance[]): Transaction[] {
  // Positive = is owed money (creditor), Negative = owes money (debtor)
  const netAmounts = new Map<string, number>();

  for (const b of balances) {
    const current = netAmounts.get(b.userId) ?? 0;
    netAmounts.set(b.userId, current + b.amount);
  }

  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  for (const [userId, amount] of netAmounts) {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded > 0) {
      creditors.push({ userId, amount: rounded });
    } else if (rounded < 0) {
      debtors.push({ userId, amount: -rounded });
    }
  }

  // Sortin Descending by amount :)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const settle = Math.min(creditors[ci].amount, debtors[di].amount);
    const settleRounded = Math.round(settle * 100) / 100;

    if (settleRounded > 0) {
      transactions.push({
        from: debtors[di].userId,
        to: creditors[ci].userId,
        amount: settleRounded,
      });
    }

    creditors[ci].amount = Math.round((creditors[ci].amount - settle) * 100) / 100;
    debtors[di].amount = Math.round((debtors[di].amount - settle) * 100) / 100;

    if (creditors[ci].amount === 0) ci++;
    if (debtors[di].amount === 0) di++;
  }

  return transactions;
}
