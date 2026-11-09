import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: process.env.NODE_ENV !== "production" || process.env.AUTH_TRUST_HOST === "true",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
        session.user.plan = token.plan === "PRO" ? "PRO" : "FREE";
        session.user.suspended = Boolean(token.suspended);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
