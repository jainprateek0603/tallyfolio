import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="font-display text-2xl text-ink">
        Tallyfolio
      </Link>
      <nav aria-label="Marketing" className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/pricing" className="underline-offset-4 hover:underline">
          Pricing
        </Link>
        <Link href="/login" className="underline-offset-4 hover:underline">
          Sign in
        </Link>
        <Link href="/register" className="bg-cobalt px-3 py-2 text-on-cobalt">
          Create a free account
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
