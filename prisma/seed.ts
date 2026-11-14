// Demo data for local development. Safe to re-run: it removes and recreates the demo users only.
import { randomBytes } from "node:crypto";
import { PrismaClient, type InvoiceStatus, type Plan, type Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_USERS: { email: string; name: string; password: string; plan: Plan; role: Role }[] = [
  { email: "alex@tallyfolio.test", name: "Alex Rivera", password: "DemoPass123!", plan: "PRO", role: "USER" },
  { email: "sam@tallyfolio.test", name: "Sam Chen", password: "DemoPass123!", plan: "FREE", role: "USER" },
  { email: "admin@tallyfolio.test", name: "Admin", password: "AdminPass123!", plan: "PRO", role: "ADMIN" },
];

const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
const daysFromToday = (days: number) => new Date(today.getTime() + days * 86_400_000);
const publicToken = () => randomBytes(24).toString("base64url");

async function removeDemoUsers() {
  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_USERS.map((user) => user.email) } },
    select: { id: true },
  });
  const userId = { in: users.map((user) => user.id) };
  // Clients and projects are ON DELETE RESTRICT from invoices/projects, so clear children first.
  await prisma.invoice.deleteMany({ where: { userId } });
  await prisma.recurringSchedule.deleteMany({ where: { userId } });
  await prisma.expense.deleteMany({ where: { userId } });
  await prisma.project.deleteMany({ where: { userId } });
  await prisma.client.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

type SeedInvoice = {
  clientIndex: number;
  status: InvoiceStatus;
  issuedDaysAgo: number;
  termDays: number;
  items: { description: string; quantityHundredths: number; unitCents: number }[];
};

async function createWorkspace(
  userId: string,
  clients: { name: string; email: string; company: string }[],
  invoices: SeedInvoice[],
) {
  const clientIds: string[] = [];
  for (const client of clients) {
    const created = await prisma.client.create({ data: { ...client, userId } });
    clientIds.push(created.id);
  }

  const project = await prisma.project.create({
    data: {
      userId,
      clientId: clientIds[0],
      name: "Website refresh",
      description: "Redesign and rebuild the marketing site.",
      budgetCents: 1_200_000,
      dueDate: daysFromToday(45),
      tasks: {
        create: [
          { userId, title: "Wireframes", status: "DONE", priority: "HIGH" },
          { userId, title: "Visual design", status: "IN_PROGRESS", priority: "HIGH", dueDate: daysFromToday(7) },
          { userId, title: "Build pages", status: "TODO", priority: "MEDIUM", dueDate: daysFromToday(30) },
        ],
      },
    },
  });

  let sequence = 1000;
  for (const invoice of invoices) {
    sequence += 1;
    const issueDate = daysFromToday(-invoice.issuedDaysAgo);
    const dueDate = daysFromToday(-invoice.issuedDaysAgo + invoice.termDays);
    const sent = invoice.status !== "DRAFT";
    await prisma.invoice.create({
      data: {
        userId,
        clientId: clientIds[invoice.clientIndex],
        projectId: invoice.clientIndex === 0 ? project.id : null,
        number: `INV-${sequence}`,
        status: invoice.status,
        issueDate,
        dueDate,
        sentAt: sent ? issueDate : null,
        paidAt: invoice.status === "PAID" ? daysFromToday(-invoice.issuedDaysAgo + 10) : null,
        publicToken: sent ? publicToken() : null,
        items: { create: invoice.items.map((item, sortOrder) => ({ ...item, sortOrder })) },
      },
    });
  }
  await prisma.user.update({ where: { id: userId }, data: { invoiceSequence: sequence } });
}

async function main() {
  await removeDemoUsers();

  const ids: Record<string, string> = {};
  for (const user of DEMO_USERS) {
    const created = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        passwordHash: await hash(user.password, 10),
        plan: user.plan,
        role: user.role,
        emailVerified: new Date(),
        businessName: `${user.name} Studio`,
        hourlyRateCents: 9_500,
      },
    });
    ids[user.email] = created.id;
  }

  const design = { description: "Design work", quantityHundredths: 1_200, unitCents: 9_500 };
  const dev = { description: "Development", quantityHundredths: 2_050, unitCents: 11_000 };
  const hosting = { description: "Hosting (monthly)", quantityHundredths: 100, unitCents: 4_900 };

  // Pro user: a spread of statuses, including one overdue invoice.
  await createWorkspace(
    ids["alex@tallyfolio.test"],
    [
      { name: "Jordan Lee", email: "jordan@northwind.test", company: "Northwind Goods" },
      { name: "Priya Patel", email: "priya@lumen.test", company: "Lumen Labs" },
      { name: "Casey Morgan", email: "casey@harbor.test", company: "Harbor & Co" },
      { name: "Taylor Kim", email: "taylor@orbit.test", company: "Orbit Media" },
    ],
    [
      { clientIndex: 0, status: "PAID", issuedDaysAgo: 75, termDays: 30, items: [design, dev] },
      { clientIndex: 1, status: "PAID", issuedDaysAgo: 50, termDays: 14, items: [dev] },
      { clientIndex: 2, status: "SENT", issuedDaysAgo: 40, termDays: 14, items: [design] },
      { clientIndex: 3, status: "SENT", issuedDaysAgo: 5, termDays: 30, items: [hosting, dev] },
      { clientIndex: 0, status: "DRAFT", issuedDaysAgo: 0, termDays: 30, items: [design] },
      { clientIndex: 1, status: "PAID", issuedDaysAgo: 20, termDays: 14, items: [hosting] },
    ],
  );

  // Free user: one client and one invoice below each plan limit.
  await createWorkspace(
    ids["sam@tallyfolio.test"],
    [
      { name: "Robin Ortiz", email: "robin@maple.test", company: "Maple Bakery" },
      { name: "Avery Brooks", email: "avery@cobalt.test", company: "Cobalt Fitness" },
    ],
    [
      { clientIndex: 0, status: "PAID", issuedDaysAgo: 60, termDays: 14, items: [design] },
      { clientIndex: 1, status: "PAID", issuedDaysAgo: 30, termDays: 14, items: [hosting] },
      { clientIndex: 0, status: "SENT", issuedDaysAgo: 25, termDays: 14, items: [dev] },
      { clientIndex: 1, status: "DRAFT", issuedDaysAgo: 0, termDays: 14, items: [hosting] },
    ],
  );

  console.log(`Seeded ${DEMO_USERS.length} demo users.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
