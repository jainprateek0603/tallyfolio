import { z } from "zod";
import { isCurrencyCode } from "@/lib/money";

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

const blankToNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => {
      if (value == null || value === "") return null;
      return value;
    });

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .transform((value) => {
    if (value == null || value === "") return null;
    return value.toLowerCase();
  })
  .refine((value) => value === null || z.email().safeParse(value).success, {
    message: "Enter a valid email.",
  });

const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code.")
  .transform((value) => value.toUpperCase())
  .refine((value) => isCurrencyCode(value), { message: "Use a known currency code." });

const basisPoints = z.number().int().min(0).max(10_000);
const cents = z.number().int().min(0).max(100_000_000);
const isoDate = z.iso.date("Enter a date as YYYY-MM-DD.");

export const idSchema = z.string().trim().min(1).max(64);
const filterId = z.string().trim().min(1).max(64).optional();

/** Search, page and page-size fields shared by every list endpoint. */
const listFields = {
  q: z.string().trim().max(100).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
};

const hasSomeField = (value: Record<string, unknown>) =>
  Object.values(value).some((item) => item !== undefined);
const SOME_FIELD = { message: "Provide a field to update." };

/** Rejects a due date before the issue date when both are present. */
function checkDateOrder(value: { issueDate?: string; dueDate?: string }, ctx: z.RefinementCtx) {
  if (value.issueDate && value.dueDate && value.dueDate < value.issueDate) {
    ctx.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Due date must be on or after the issue date.",
    });
  }
}

// bcrypt only reads the first 72 bytes, so cap by bytes, not characters.
const BCRYPT_MAX_BYTES = 72;
const byteLength = (value: string) => new TextEncoder().encode(value).length;

// ---------------------------------------------------------------------------
// Auth and account
// ---------------------------------------------------------------------------

export const emailSchema = z
  .email("Enter a valid email.")
  .transform((value) => value.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .refine((value) => byteLength(value) <= BCRYPT_MAX_BYTES, {
    message: "Use a shorter password (at most 72 bytes).",
  })
  .regex(/[A-Za-z]/, "Include a letter.")
  .regex(/[0-9]/, "Include a number.");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1)
    .refine((value) => byteLength(value) <= BCRYPT_MAX_BYTES),
});

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(80).optional(),
    image: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .refine(
        (value) => {
          if (value == null || value === "") return true;
          try {
            const url = new URL(value);
            return url.protocol === "http:" || url.protocol === "https:";
          } catch {
            return false;
          }
        },
        { message: "Enter an http(s) image URL." },
      ),
  })
  .refine(hasSomeField, SOME_FIELD);

export const settingsSchema = z
  .object({
    businessName: z.string().trim().max(120).nullable().optional(),
    businessAddress: z.string().trim().max(500).nullable().optional(),
    taxId: z.string().trim().max(40).nullable().optional(),
    taxLabel: z.string().trim().min(1).max(40).optional(),
    defaultTaxRateBps: basisPoints.optional(),
    hourlyRateCents: cents.nullable().optional(),
    currency: currencySchema.optional(),
    reminderEnabled: z.boolean().optional(),
  })
  .refine(hasSomeField, SOME_FIELD);

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clientListSchema = z.object({
  ...listFields,
  archived: z.enum(["true", "false", "all"]).optional().default("false"),
});

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  email: optionalEmail,
  company: blankToNull(120),
  phone: blankToNull(40),
  address: blankToNull(500),
  notes: blankToNull(2000),
});

export const updateClientSchema = createClientSchema
  .partial()
  .extend({ archived: z.boolean().optional() })
  .refine(hasSomeField, SOME_FIELD);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const projectStatus = z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);

export const projectListSchema = z.object({
  ...listFields,
  status: projectStatus.optional(),
  clientId: filterId,
});

// Defaults live only on the create schema. In Zod 4, `.partial()` keeps
// `.default()` values, so deriving the update schema from a schema with
// defaults would reset those fields on every PATCH.
const projectFields = {
  clientId: idSchema,
  name: z.string().trim().min(1, "Enter a project name.").max(140),
  description: blankToNull(4000),
  status: projectStatus,
  budgetCents: cents.nullable(),
  dueDate: isoDate.nullable(),
};

export const createProjectSchema = z.object({
  ...projectFields,
  status: projectStatus.optional().default("ACTIVE"),
  budgetCents: projectFields.budgetCents.optional(),
  dueDate: projectFields.dueDate.optional(),
});

export const updateProjectSchema = z
  .object(projectFields)
  .partial()
  .refine(hasSomeField, SOME_FIELD);

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

const taskStatus = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const taskPriority = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const taskListSchema = z.object({
  ...listFields,
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  projectId: filterId,
});

const taskFields = {
  projectId: idSchema,
  title: z.string().trim().min(1, "Enter a task title.").max(160),
  description: blankToNull(4000),
  status: taskStatus,
  priority: taskPriority,
  dueDate: isoDate.nullable(),
};

export const createTaskSchema = z.object({
  ...taskFields,
  status: taskStatus.optional().default("TODO"),
  priority: taskPriority.optional().default("MEDIUM"),
  dueDate: taskFields.dueDate.optional(),
});

export const updateTaskSchema = z.object(taskFields).partial().refine(hasSomeField, SOME_FIELD);

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

const lineSchema = z.object({
  description: z.string().trim().min(1, "Describe the line.").max(200),
  quantityHundredths: z.number().int().min(1).max(1_000_000),
  unitCents: cents,
});
const lineItems = z.array(lineSchema).min(1, "Add at least one line.").max(50);

export const invoiceListSchema = z.object({
  ...listFields,
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]).optional(),
  clientId: filterId,
});

const invoiceFields = {
  clientId: idSchema,
  projectId: idSchema.nullable(),
  issueDate: isoDate,
  dueDate: isoDate,
  taxRateBps: basisPoints,
  lateFeeBps: basisPoints,
  currency: currencySchema,
  notes: blankToNull(2000),
  items: lineItems,
};

export const createInvoiceSchema = z
  .object({
    ...invoiceFields,
    projectId: invoiceFields.projectId.optional(),
    taxRateBps: basisPoints.optional(),
    lateFeeBps: basisPoints.optional(),
    currency: currencySchema.optional(),
  })
  .superRefine(checkDateOrder);

/**
 * Checks issueDate/dueDate order only when both are sent. Update routes must
 * pass the result through `mergeInvoiceDates` to check against stored dates.
 */
export const updateInvoiceSchema = z
  .object(invoiceFields)
  .partial()
  .refine(hasSomeField, SOME_FIELD)
  .superRefine(checkDateOrder);

// SENT -> DRAFT is allowed by invoice-status.ts; OVERDUE is derived, never set.
export const invoiceStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID"]),
});

export const publicTokenSchema = z.string().trim().min(16).max(80);

// ---------------------------------------------------------------------------
// Recurring schedules, time and expenses
// ---------------------------------------------------------------------------

export const scheduleSchema = z.object({
  clientId: idSchema,
  projectId: idSchema.nullable().optional(),
  interval: z.enum(["WEEKLY", "MONTHLY"]),
  nextRunOn: isoDate,
  taxRateBps: basisPoints.optional(),
  lateFeeBps: basisPoints.optional(),
  dueDays: z.number().int().min(0).max(365).optional(),
  currency: currencySchema.optional(),
  notes: blankToNull(2000),
  items: lineItems,
});

export const schedulePatchSchema = z.object({
  active: z.boolean(),
});

export const timeStartSchema = z.object({
  projectId: idSchema,
  description: z.string().trim().max(200).optional(),
});

export const billTimeSchema = z.object({
  entryIds: z.array(idSchema).min(1).max(50),
  hourlyRateCents: cents,
});

export const expenseSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amountCents: cents,
  currency: currencySchema,
  category: z.enum(["SOFTWARE", "TRAVEL", "CONTRACTOR", "SUPPLIES", "OTHER"]),
  incurredOn: isoDate,
  clientId: idSchema.nullable().optional(),
  projectId: idSchema.nullable().optional(),
  notes: blankToNull(2000),
});

export const exportQuerySchema = z.object({
  resource: z.enum(["clients", "invoices", "expenses"]),
  format: z.enum(["csv", "xls"]),
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminUserSchema = z
  .object({
    role: z.enum(["USER", "ADMIN"]).optional(),
    suspended: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.suspended !== undefined, {
    message: "Provide a role or suspended flag.",
  });

export const adminUserListSchema = z.object(listFields);

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type AdminUserInput = z.infer<typeof adminUserSchema>;
