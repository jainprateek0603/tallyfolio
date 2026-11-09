import { compare, hash } from "bcryptjs";
import { ApiError } from "@/lib/api-error";
import { isPrismaCode } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { RegisterInput } from "@/lib/schemas";

const BCRYPT_COST = 12;

// Compared against when the email is unknown, so a miss takes as long as a hit.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hash("timing-equaliser", BCRYPT_COST));

export async function registerUser(input: RegisterInput, ip: string) {
  enforceRateLimit(`register:${ip}`);
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hash(input.password, BCRYPT_COST),
      },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    }
    throw error;
  }
}

/** Returns the user when the password matches and the account is usable, else null. */
export async function verifyPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const matches = await compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user?.passwordHash || !matches || user.suspended) return null;
  return user;
}
