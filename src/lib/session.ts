import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in user, read fresh from the database so that suspension, plan
 * and settings changes apply at once instead of when the JWT expires.
 */
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.suspended) return null;
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages: sends visitors who are not signed in to /signin. */
export async function requirePageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/** For API routes: 401 when not signed in. */
export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
  return user;
}
