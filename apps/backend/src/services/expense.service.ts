import { prisma } from "@splitfare/db";
import { calculateEqualSplit } from "@splitfare/utils";
import { AppError } from "../config/app-error.js";

export async function createExpense(input: {
  groupId: string;
  amount: number;
  currency: string;
  description: string;
  paidBy: string;
  participants?: string[];
}) {
  // Verify payer is a member
  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId: input.groupId, userId: input.paidBy } },
  });
  if (!membership) {
    throw new AppError("FORBIDDEN", "You are not a member of this group", 403);
  }

  // Get participants: explicit list or all group members
  let participantIds: string[];
  if (input.participants && input.participants.length > 0) {
    participantIds = input.participants;
  } else {
    const members = await prisma.membership.findMany({
      where: { groupId: input.groupId },
      select: { userId: true },
    });
    participantIds = members.map((m) => m.userId);
  }

  if (participantIds.length === 0) {
    throw new AppError("BAD_REQUEST", "No participants for this expense", 400);
  }

  // Calculate equal split
  const splits = calculateEqualSplit(input.amount, participantIds);

  return prisma.expense.create({
    data: {
      groupId: input.groupId,
      paidBy: input.paidBy,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      splitType: "EQUAL",
      splits: {
        create: splits.map((s) => ({
          userId: s.userId,
          amount: s.amount,
        })),
      },
    },
    include: { splits: true },
  });
}

export async function getGroupExpenses(groupId: string, userId: string) {
  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    throw new AppError("FORBIDDEN", "You are not a member of this group", 403);
  }

  return prisma.expense.findMany({
    where: { groupId },
    include: { splits: { include: { user: true } }, payer: true },
    orderBy: { createdAt: "desc" },
  });
}
