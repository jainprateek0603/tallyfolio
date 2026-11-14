import type { z } from "zod";
import { firstParam } from "@/lib/query";
import {
  adminUserListSchema,
  clientListSchema,
  invoiceListSchema,
  projectListSchema,
  taskListSchema,
} from "@/lib/schemas";

type RawSearch = Record<string, string | string[] | undefined>;
export type SearchParams = Promise<RawSearch>;

const PAGE_SIZE = 20;
const FIRST_PAGE = { q: "", page: 1, limit: PAGE_SIZE };

/**
 * Parses page search params with a list schema. Bad input (a typo in the URL)
 * falls back to the first unfiltered page instead of erroring.
 */
function read<S extends z.ZodType>(
  schema: S,
  raw: RawSearch,
  filters: readonly string[],
  fallback: z.output<S>,
): z.output<S> {
  const input: Record<string, string | undefined> = {
    q: firstParam(raw.q) ?? "",
    page: firstParam(raw.page) ?? "1",
    limit: String(PAGE_SIZE),
  };
  for (const key of filters) input[key] = firstParam(raw[key]);
  const result = schema.safeParse(input);
  return result.success ? result.data : fallback;
}

export const readClientQuery = (raw: RawSearch) =>
  read(clientListSchema, raw, ["archived"], {
    ...FIRST_PAGE,
    archived: "false",
  });

export const readProjectQuery = (raw: RawSearch) =>
  read(projectListSchema, raw, ["status", "clientId"], FIRST_PAGE);

export const readTaskQuery = (raw: RawSearch) =>
  read(taskListSchema, raw, ["status", "priority", "projectId"], FIRST_PAGE);

export const readInvoiceQuery = (raw: RawSearch) =>
  read(invoiceListSchema, raw, ["status", "clientId"], FIRST_PAGE);

export const readAdminQuery = (raw: RawSearch) => read(adminUserListSchema, raw, [], FIRST_PAGE);

export function pageHref(path: string, query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
