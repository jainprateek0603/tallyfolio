import { prisma } from "@/lib/prisma";

/** Clients and projects for the invoice form's pickers. */
export async function loadInvoiceFormOptions(userId: string, includeClientId?: string) {
  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      // Archived clients are hidden, except the one an existing invoice already uses.
      where: { userId, OR: [{ archived: false }, ...(includeClientId ? [{ id: includeClientId }] : [])] },
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { userId, status: { not: "ARCHIVED" } },
      select: { id: true, name: true, clientId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    clients: clients.map((client) => ({
      id: client.id,
      label: client.company ? `${client.name} · ${client.company}` : client.name,
    })),
    projects: projects.map((project) => ({ id: project.id, label: project.name, clientId: project.clientId })),
  };
}
