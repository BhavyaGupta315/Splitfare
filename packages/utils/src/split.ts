import type { SplitResult } from "@splitfare/types";

/**
 * Split an amount equally among participants.
 * Remainder cents are distributed one per participant from the start. hehe
 */
export function calculateEqualSplit(
  amount: number,
  participants: string[]
): SplitResult[] {
  if (participants.length === 0) {
    throw new Error("At least one participant is required");
  }
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const count = participants.length;
  const centsTotal = Math.round(amount * 100);
  const baseCents = Math.floor(centsTotal / count);
  const remainder = centsTotal - baseCents * count;

  return participants.map((userId, i) => ({
    userId,
    amount: (baseCents + (i < remainder ? 1 : 0)) / 100,
  }));
}
