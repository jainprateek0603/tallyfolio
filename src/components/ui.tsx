import Link from "next/link";

export function PageHeader({
  title,
  lede,
  action,
}: {
  title: string;
  lede?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-prose">
        <h1 className="font-display text-4xl leading-tight text-ink">{title}</h1>
        {lede ? <p className="mt-2 text-muted">{lede}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm text-ink">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const controlClass =
  "w-full border border-rule bg-sheet px-3 py-2 text-ink placeholder:text-muted";

export function Alert({ message, code }: { message: string; code?: string }) {
  return (
    <div role="alert" className="border border-overdue bg-sheet px-3 py-2 text-sm text-overdue">
      <p>{message}</p>
      {code === "PLAN_LIMIT" ? (
        <p className="mt-1">
          <Link href="/settings" className="underline">
            Review billing
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-rule px-4 py-8">
      <p className="text-ink">{title}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Composer({
  title,
  startOpen = false,
  children,
}: {
  title: string;
  startOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="mb-8 max-w-xl border border-rule bg-sheet" {...(startOpen ? { open: true } : {})}>
      <summary className="cursor-pointer px-4 py-3 font-display text-xl">{title}</summary>
      <div className="border-t border-rule p-4">{children}</div>
    </details>
  );
}

const tone: Record<string, string> = {
  DRAFT: "text-muted",
  SENT: "text-cobalt",
  PAID: "text-pine",
  OVERDUE: "text-overdue",
  ACTIVE: "text-pine",
  PAUSED: "text-brass",
  COMPLETED: "text-muted",
  ARCHIVED: "text-muted",
  TODO: "text-muted",
  IN_PROGRESS: "text-cobalt",
  DONE: "text-pine",
  LOW: "text-muted",
  MEDIUM: "text-ink",
  HIGH: "text-overdue",
  FREE: "text-muted",
  PRO: "text-brass",
  USER: "text-ink",
  ADMIN: "text-cobalt",
};

export function StatusText({ value }: { value: string }) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return (
    <span
      className={`inline-block border border-current px-1.5 py-0.5 text-xs leading-5 capitalize ${tone[value] ?? "text-ink"}`}
    >
      {label}
    </span>
  );
}

export function Pager({
  page,
  total,
  limit,
  hrefFor,
}: {
  page: number;
  total: number;
  limit: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total === 0 || pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center gap-4 text-sm">
      {page > 1 ? (
        <a className="underline" href={hrefFor(page - 1)}>
          Previous
        </a>
      ) : (
        <span className="text-muted">Previous</span>
      )}
      <span className="num">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <a className="underline" href={hrefFor(page + 1)}>
          Next
        </a>
      ) : (
        <span className="text-muted">Next</span>
      )}
    </nav>
  );
}

export function DataTable({
  caption,
  plain = false,
  children,
}: {
  caption: string;
  plain?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={plain ? "mt-6 overflow-x-auto" : "overflow-x-auto border border-rule bg-sheet"}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function buttonClass(kind: "primary" | "quiet" | "danger" = "primary") {
  if (kind === "primary") return "inline-flex items-center bg-cobalt px-4 py-2 text-on-cobalt disabled:opacity-60";
  if (kind === "danger") {
    return "inline-flex items-center bg-overdue px-4 py-2 text-white disabled:opacity-60 dark:text-[#1a2332]";
  }
  return "inline-flex items-center border border-rule bg-sheet px-4 py-2 text-ink disabled:opacity-60";
}
