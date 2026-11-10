import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.suspended) return null;
  return user;
});

export async function requireUser() {
  try {
    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "local";
    assertRateLimit(`api:${ip}`, 300, 60_000);
  } catch (error) {
    if (error instanceof ApiError) throw error;
  }
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Sign in required.");
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Sign in required.");
  if (user.suspended) throw new ApiError(403, "SUSPENDED", "This account is suspended.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Admin access required.");
  }
  return user;
}

export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePageAdmin() {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
