import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  // Preserve whitespace and do not enforce new-password rules at sign-in.
  password: z.string().min(1).max(1024),
});

export type AuthState = { error: string };
