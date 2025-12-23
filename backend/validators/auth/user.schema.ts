
import z from "zod";

export const userSchame = z.object({
  first_name: z
    .string()
    .min(3, "First Name must be atleast 3 characters")
    .max(50, "First Name must not be more than 50 characters"),
  last_name: z
    .string()
    .min(3, "Last Name must be atleast 3 characters")
    .max(50, "Last Name must not be more than 50 characters"),
  user_name: z
    .string()
    .min(3, "User Name must be atleast 3 characters")
    .max(50, "User Name must not be more than 50 characters"),
  email: z.email("Please provide a valid email"),
  phone: z
    .string()
    .min(7, "Please provide a valid phone number")
    .max(14, "Please provide a valid phone number"),
  password: z
    .string()
    .min(8, "Please provide a strong password")
    .max(50, "You have to make the password reasonable"),
});

export type userInputDto = z.infer<typeof userSchame>; 
