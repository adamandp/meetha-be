import { z } from "zod";
export const getRoles = {
  query: z.strictObject({
    limit: z.coerce.number().min(1).optional(),
    page: z.coerce.number().min(1).optional(),
  }),
};
export const getRole = {
  params: z.strictObject({ roleId: z.coerce.number() }),
};
export const createRole = {
  body: z.strictObject({
    name: z.string().min(1),
    description: z.string().min(1).optional(),
  }),
};
export const updateRole = {
  params: z.strictObject({ roleId: z.string().min(1) }),
  body: z
    .strictObject({
      name: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
    })
    .refine((v) => Object.keys(v).length > 0),
};
