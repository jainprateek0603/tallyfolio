import { firstParam } from "@/lib/query";
import {
  adminUserListSchema,
  clientListSchema,
  invoiceListSchema,
  projectListSchema,
  taskListSchema,
} from "@/lib/schemas";

type RawSearch = Record<string, string | string[] | undefined>;

function read<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

export function readClientQuery(raw: RawSearch) {
  return read(
    clientListSchema,
    {
      q: firstParam(raw.q) ?? "",
      archived: firstParam(raw.archived) ?? "false",
      page: firstParam(raw.page) ?? "1",
      limit: "20",
    },
    { q: "", archived: "false" as const, page: 1, limit: 20 },
  );
}

export function readProjectQuery(raw: RawSearch) {
  return read(
    projectListSchema,
    {
      q: firstParam(raw.q) ?? "",
      status: firstParam(raw.status),
      clientId: firstParam(raw.clientId),
      page: firstParam(raw.page) ?? "1",
      limit: "20",
    },
    { q: "", page: 1, limit: 20 },
  );
}

export function readTaskQuery(raw: RawSearch) {
  return read(
    taskListSchema,
    {
      q: firstParam(raw.q) ?? "",
      status: firstParam(raw.status),
      priority: firstParam(raw.priority),
      projectId: firstParam(raw.projectId),
      page: firstParam(raw.page) ?? "1",
      limit: "20",
    },
    { q: "", page: 1, limit: 20 },
  );
}

export function readInvoiceQuery(raw: RawSearch) {
  return read(
    invoiceListSchema,
    {
      q: firstParam(raw.q) ?? "",
      status: firstParam(raw.status),
      clientId: firstParam(raw.clientId),
      page: firstParam(raw.page) ?? "1",
      limit: "20",
    },
    { q: "", page: 1, limit: 20 },
  );
}

export function readAdminQuery(raw: RawSearch) {
  return read(
    adminUserListSchema,
    {
      q: firstParam(raw.q) ?? "",
      page: firstParam(raw.page) ?? "1",
      limit: "20",
    },
    { q: "", page: 1, limit: 20 },
  );
}

export type SearchParams = Promise<RawSearch>;

export function pageHref(path: string, query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
