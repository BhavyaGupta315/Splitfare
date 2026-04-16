import { prisma } from "@splitfare/db";

/**
 * Wipe all rows in FK-safe order.
 * Call in beforeEach inside each test file.
 */
export async function cleanDb() {
  await prisma.settlement.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
}
