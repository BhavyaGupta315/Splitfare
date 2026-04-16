import { prisma } from "@splitfare/db";
import { AppError } from "../config/app-error.js";

export async function createGroup(name: string, userId: string) {
  return prisma.group.create({
    data: {
      name,
      createdBy: userId,
      members: {
        create: { userId },
      },
    },
    include: { members: { include: { user: true } } },
  });
}

export async function getUserGroups(userId: string) {
  return prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGroupById(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
      expenses: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!group) {
    throw new AppError("NOT_FOUND", "Group not found", 404);
  }

  const isMember = group.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError("FORBIDDEN", "You are not a member of this group", 403);
  }

  return group;
}

export async function addMember(groupId: string, email: string, requesterId: string) {
  // Verify requester is a member
  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId: requesterId } },
  });
  if (!membership) {
    throw new AppError("FORBIDDEN", "You are not a member of this group", 403);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found with that email", 404);
  }

  const existing = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (existing) {
    throw new AppError("CONFLICT", "User is already a member", 409);
  }

  return prisma.membership.create({
    data: { groupId, userId: user.id },
    include: { user: true },
  });
}
