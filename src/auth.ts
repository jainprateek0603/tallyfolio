import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { headers } from "next/headers";
import { authConfig } from "@/auth.config";
import { AUTH_WINDOW_MS, authRateLimit, rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/schemas";

let dummyHash: string | null = null;

async function dummyPasswordHash() {
  if (!dummyHash) {
    dummyHash = await bcrypt.hash("tallyfolio-not-a-user", 12);
  }
  return dummyHash;
}

const providers: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

providers.push(
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      const limit = rateLimit(`login:${ip}:${parsed.data.email}`, authRateLimit(), AUTH_WINDOW_MS);
      if (!limit.ok) return null;

      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      const hash = user?.passwordHash ?? (await dummyPasswordHash());
      const matches = await bcrypt.compare(parsed.data.password, hash);
      if (!user?.passwordHash || !matches || user.suspended) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      if (existing?.suspended) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (!token.id && typeof token.email === "string") {
        const byEmail = await prisma.user.findUnique({ where: { email: token.email } });
        if (byEmail) token.id = byEmail.id;
      }
      if (typeof token.id !== "string") return token;

      const dbUser = await prisma.user.findUnique({ where: { id: token.id } });
      if (!dbUser || dbUser.suspended) {
        token.suspended = true;
        return token;
      }
      token.role = dbUser.role;
      token.plan = dbUser.plan;
      token.suspended = false;
      token.name = dbUser.name;
      token.email = dbUser.email;
      token.picture = dbUser.image;
      return token;
    },
  },
});
