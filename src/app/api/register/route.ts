import { handleError, ok, parseBody, readJson } from "@/lib/http";
import { clientIp } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/schemas";
import { registerUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const input = parseBody(registerSchema, await readJson(request));
    const user = await registerUser(input, clientIp(request.headers));
    return ok(user, 201);
  } catch (error) {
    return handleError(error);
  }
}
