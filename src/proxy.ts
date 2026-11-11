import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const APP_PREFIXES = [
  "/dashboard",
  "/clients",
  "/projects",
  "/tasks",
  "/invoices",
  "/settings",
  "/time",
  "/expenses",
  "/recurring",
];

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const user = request.auth?.user;
  const loggedIn = Boolean(user?.id) && !user?.suspended;

  if (pathname.startsWith("/admin")) {
    if (!loggedIn) return NextResponse.redirect(new URL("/login", request.nextUrl));
    if (user?.role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    return NextResponse.next();
  }

  const isApp = APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isApp && !loggedIn) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (loggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
