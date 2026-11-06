import { z } from "zod";
export const password = z
  .string()
  .min(8, "password must be at least 8 characters")
  .regex(
    /(?=.*[a-zA-Z])(?=.*\d)/,
    "password must contain at least 1 letter and 1 number",
  );
export const login = {
  body: z.strictObject({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
};
export const register = {
  body: z.strictObject({
    email: z.email(),
    password,
    fullname: z.string().min(1),
    username: z.string().min(1),
    phone_number: z.string().min(1),
    company_name: z.unknown().optional(),
  }),
};
export const resetPassword = {
  body: z.strictObject({ id: z.coerce.number().int(), password }),
};
