import { z } from "zod";

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});


export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
});

export const addMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
});


export const createExpenseSchema = z.object({
  groupId: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required").max(500),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENT"]).default("EQUAL"),
  participants: z.array(z.string().uuid()).optional(),
});


export const createSettlementSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
});


export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT secret must be at least 16 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
});


export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type EnvConfig = z.infer<typeof envSchema>;
