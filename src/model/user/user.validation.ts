import { z } from "zod";
import { password } from "../auth/auth.validation";
export const getUsers = {
  query: z.strictObject({
    name: z.string().min(1).optional(),
    email: z.email().optional(),
    roleId: z.coerce.number().optional(),
    limit: z.coerce.number().min(1).optional(),
    page: z.coerce.number().min(1).optional(),
    ufa: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
  }),
};
export const getUser = { params: z.strictObject({ userId: z.string() }) };
export const updateUser = {
  params: z.strictObject({ userId: z.string().min(1) }),
  body: z
    .strictObject({
      email: z.email().optional(),
      password: password.optional(),
      name: z.string().min(1).optional(),
    })
    .refine((v) => Object.keys(v).length > 0),
};
