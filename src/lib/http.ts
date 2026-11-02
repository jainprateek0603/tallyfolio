import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { captureException } from "@/lib/log";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be JSON.");
  }
}

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Check the highlighted fields.",
      z.flattenError(result.error),
    );
  }
  return result.data;
}

export async function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  await captureException(error, { source: "api" });
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong." } },
    { status: 500 },
  );
}
