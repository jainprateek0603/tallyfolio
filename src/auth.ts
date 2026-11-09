import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { CredentialsSignin } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { clientIp, consume } from "@/lib/rate-limit";
import { credentialsSchema } from "@/lib/schemas";
import { verifyPassword } from "@/lib/users";

/** Shown on the sign-in page; the code ends up in the URL, so it must not leak details. */
export class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw, request) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      // Limit per address and per account, so neither one IP nor many IPs can brute-force.
      const ip = clientIp(request.headers);
      const ipOk = consume(`signin:ip:${ip}`);
      const emailOk = consume(`signin:email:${email}`);
      if (!ipOk || !emailOk) throw new RateLimitedSignin();

      const user = await verifyPassword(email, password);
      return user ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials sign-in only works with JWT sessions.
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return true;
      const existing = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { suspended: true },
      });
      return !existing?.suspended;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
