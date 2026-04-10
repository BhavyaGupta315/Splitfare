import { envSchema } from "@splitfare/validation";

export const env = envSchema.parse(process.env);
