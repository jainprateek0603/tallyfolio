import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24">
      <h1 className="font-display text-4xl">That page is not in the ledger.</h1>
      <p className="mt-3">
        <Link href="/" className="underline">
          Back to Tallyfolio
        </Link>
      </p>
    </main>
  );
}
