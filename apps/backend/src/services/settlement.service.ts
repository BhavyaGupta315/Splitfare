import { prisma } from "@splitfare/db";
import { AppError } from "../config/app-error.js";

export async function createSettlement(input: {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
}) {
  if (input.fromUserId === input.toUserId) {
    throw new AppError("BAD_REQUEST", "Cannot settle with yourself", 400);
  }

  const memberships = await prisma.membership.findMany({
    where: {
      groupId: input.groupId,
      userId: { in: [input.fromUserId, input.toUserId] },
    },
    select: { userId: true },
  });

  const memberIds = new Set(memberships.map((m) => m.userId));

  if (!memberIds.has(input.fromUserId)) {
    throw new AppError("FORBIDDEN", "You are not a member of this group", 403);
  }
  if (!memberIds.has(input.toUserId)) {
    throw new AppError("BAD_REQUEST", "Recipient is not a member of this group", 400);
  }

  return prisma.settlement.create({
    data: {
      groupId: input.groupId,
      fromUser: input.fromUserId,
      toUser: input.toUserId,
      amount: input.amount,
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getGroupSettlements(groupId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    throw new AppError("FORBIDDEN", "You are not a member of this group", 403);
  }

  return prisma.settlement.findMany({
    where: { groupId },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { settledAt: "desc" },
  });
}
