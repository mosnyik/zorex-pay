import z from "zod";

export const userLoginSchame = z.object({
  email: z.email("Please provide a valid email"),
  password: z
    .string()
    .min(8, "Please provide your strong password")
    .max(50, "This password is too long"),
});

export type userLoginDto = z.infer<typeof userLoginSchame>;
