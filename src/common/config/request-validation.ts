import { HttpException } from "@nestjs/common";
import { z } from "zod";
export type RequestSchema = Partial<
  Record<"body" | "query" | "params", z.ZodType>
>;
export function validateRequest(req: any, schemas: RequestSchema) {
  for (const [key, schema] of Object.entries(schemas)) {
    const parsed = schema.safeParse(req[key]);
    if (!parsed.success)
      throw new HttpException(
        {
          code: 400,
          message: parsed.error.issues.map((i) => i.message).join(", "),
        },
        400,
      );
    Object.defineProperty(req, key, {
      value: parsed.data,
      writable: true,
      configurable: true,
    });
  }
}
