import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { idSchema } from "@/lib/schemas";

export async function readId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    throw new ApiError(404, "NOT_FOUND", "Not found.");
  }
  return parsed.data;
}

export function flattenIssues(error: z.ZodError) {
  return z.flattenError(error);
}
