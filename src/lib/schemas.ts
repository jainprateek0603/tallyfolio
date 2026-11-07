import { z } from "zod";
import { isCurrencyCode } from "@/lib/money";

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

export const emailSchema = z
  .email("Enter a valid email.")
  .transform((value) => value.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include a letter.")
  .regex(/[0-9]/, "Include a number.");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

const isoDate = z.iso.date("Enter a date as YYYY-MM-DD.");

export const idSchema = z.string().trim().min(1).max(64);

export const clientListSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  archived: z.enum(["true", "false", "all"]).optional().default("false"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
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
  .extend({
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide a field to update.",
  });

export const projectListSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  clientId: z.string().trim().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const createProjectSchema = z.object({
  clientId: idSchema,
  name: z.string().trim().min(1, "Enter a project name.").max(140),
  description: blankToNull(4000),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional().default("ACTIVE"),
  budgetCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  dueDate: isoDate.nullable().optional(),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide a field to update.",
  });

export const taskListSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  projectId: z.string().trim().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const createTaskSchema = z.object({
  projectId: idSchema,
  title: z.string().trim().min(1, "Enter a task title.").max(160),
  description: blankToNull(4000),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional().default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  dueDate: isoDate.nullable().optional(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide a field to update.",
  });

const lineSchema = z.object({
  description: z.string().trim().min(1, "Describe the line.").max(200),
  quantityHundredths: z.number().int().min(1).max(1_000_000),
  unitCents: z.number().int().min(0).max(100_000_000),
});

export const invoiceListSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]).optional(),
  clientId: z.string().trim().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const createInvoiceSchema = z
  .object({
    clientId: idSchema,
    projectId: idSchema.nullable().optional(),
    issueDate: isoDate,
    dueDate: isoDate,
    taxRateBps: z.number().int().min(0).max(10_000).optional(),
    lateFeeBps: z.number().int().min(0).max(10_000).optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase())
      .refine((value) => isCurrencyCode(value), { message: "Use a known currency code." })
      .optional(),
    notes: blankToNull(2000),
    items: z.array(lineSchema).min(1, "Add at least one line.").max(50),
  })
  .superRefine((value, ctx) => {
    if (value.dueDate < value.issueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date must be on or after the issue date.",
      });
    }
  });

export const updateInvoiceSchema = z
  .object({
    clientId: idSchema.optional(),
    projectId: idSchema.nullable().optional(),
    issueDate: isoDate.optional(),
    dueDate: isoDate.optional(),
    taxRateBps: z.number().int().min(0).max(10_000).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(lineSchema).min(1).max(50).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide a field to update.",
  });

export const invoiceStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID"]),
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
      .refine((value) => {
        if (value == null || value === "") return true;
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }, {
        message: "Enter an http(s) image URL.",
      }),
  })
  .refine((value) => value.name !== undefined || value.image !== undefined, {
    message: "Provide a field to update.",
  });

export const settingsSchema = z
  .object({
    businessName: z.string().trim().max(120).nullable().optional(),
    businessAddress: z.string().trim().max(500).nullable().optional(),
    taxId: z.string().trim().max(40).nullable().optional(),
    taxLabel: z.string().trim().min(1).max(40).optional(),
    defaultTaxRateBps: z.number().int().min(0).max(10_000).optional(),
    hourlyRateCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code.")
      .transform((value) => value.toUpperCase())
      .refine((value) => isCurrencyCode(value), { message: "Use a known currency code." })
      .optional(),
    reminderEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide a field to update.",
  });

export const adminUserSchema = z
  .object({
    role: z.enum(["USER", "ADMIN"]).optional(),
    suspended: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.suspended !== undefined, {
    message: "Provide a role or suspended flag.",
  });

export const adminUserListSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const scheduleSchema = z.object({
  clientId: idSchema,
  projectId: idSchema.nullable().optional(),
  interval: z.enum(["WEEKLY", "MONTHLY"]),
  nextRunOn: isoDate,
  taxRateBps: z.number().int().min(0).max(10_000).optional(),
  lateFeeBps: z.number().int().min(0).max(10_000).optional(),
  dueDays: z.number().int().min(0).max(365).optional(),
  currency: z
    .string()
    .trim()
    .length(3)
    .regex(/^[A-Za-z]{3}$/)
    .transform((value) => value.toUpperCase())
    .refine((value) => isCurrencyCode(value), { message: "Use a known currency code." })
    .optional(),
  notes: blankToNull(2000),
  items: z.array(lineSchema).min(1).max(50),
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
  hourlyRateCents: z.number().int().min(0).max(100_000_000),
});

export const expenseSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amountCents: z.number().int().min(0).max(100_000_000),
  currency: z
    .string()
    .trim()
    .length(3)
    .regex(/^[A-Za-z]{3}$/)
    .transform((value) => value.toUpperCase())
    .refine((value) => isCurrencyCode(value), { message: "Use a known currency code." }),
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

export const publicTokenSchema = z.string().trim().min(16).max(80);

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
