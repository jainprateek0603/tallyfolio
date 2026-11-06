import { z } from "zod";
import { ApiError } from "@/lib/api-error";

export function parseQuery<T>(schema: z.ZodType<T>, params: URLSearchParams): T {
  const raw: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!(key in raw) && value !== "") raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Check the filters.",
      z.flattenError(result.error),
    );
  }
  return result.data;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
