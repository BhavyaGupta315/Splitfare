import { prisma } from "@splitfare/db";
import { afterAll, beforeAll } from "vitest";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
