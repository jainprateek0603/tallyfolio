import { registerSchema } from "@/lib/schemas";
import { AUTH_WINDOW_MS, assertRateLimit, authRateLimit } from "@/lib/rate-limit";
import { handleError, ok, parseBody, readJson } from "@/lib/http";
import { registerUser } from "@/server/account";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local";
    assertRateLimit(`register:${ip}`, authRateLimit(), AUTH_WINDOW_MS);
    const input = parseBody(registerSchema, await readJson(request));
    const user = await registerUser(input);
    return ok(user, 201);
  } catch (error) {
    return handleError(error);
  }
}
