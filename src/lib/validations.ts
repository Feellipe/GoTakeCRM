import { z } from "zod";
import { NextResponse } from "next/server";

// --- Enums ---

export const EventTypeEnum = z.enum([
  "wedding",
  "corporate",
  "portrait",
  "product",
  "event",
  "other",
]);

export const ClientStatusEnum = z.enum(["active", "lead", "inactive"]);

export const ClientSourceEnum = z.enum([
  "whatsapp",
  "referral",
  "website",
  "instagram",
  "other",
]);

export const DealStatusEnum = z.enum([
  "new",
  "briefing",
  "quoting",
  "production",
  "completed",
]);

export const ExpenseCategoryEnum = z.enum([
  "equipment",
  "location",
  "crew",
  "props",
  "travel",
  "other",
]);

export const RevenueStatusEnum = z.enum(["pending", "received"]);

export const BookingStatusEnum = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const DocumentTypeEnum = z.enum([
  "contract",
  "quote",
  "invoice",
  "moodboard",
  "other",
]);

export const DocumentStatusEnum = z.enum([
  "draft",
  "sent",
  "viewed",
  "signed",
]);

export const ProposalStatusEnum = z.enum([
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
]);

export const PackageCategoryEnum = z.enum([
  "photography",
  "videography",
  "both",
]);

// --- Create Schemas ---

export const clientCreateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  phone: z.string().min(1, "Phone is required"),
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().optional().nullable(),
  eventType: EventTypeEnum,
  notes: z.string().optional().nullable(),
  source: ClientSourceEnum.default("whatsapp"),
  status: ClientStatusEnum.default("active"),
  avatar: z.string().optional().nullable(),
});

export const clientUpdateSchema = z.object({
  phone: z.string().min(1).optional(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  eventType: EventTypeEnum.optional(),
  notes: z.string().optional().nullable(),
  source: ClientSourceEnum.optional(),
  status: ClientStatusEnum.optional(),
  avatar: z.string().optional().nullable(),
});

export const dealCreateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  clientId: z.string().min(1, "Client ID is required"),
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().optional().nullable(),
  status: DealStatusEnum.default("new"),
  value: z.number().min(0).default(0),
  currency: z.string().default("BRL"),
});

export const dealUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().optional().nullable(),
  status: DealStatusEnum.optional(),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
});

export const briefingCreateSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author is required"),
});

export const expenseCreateSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  category: ExpenseCategoryEnum,
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("BRL"),
  date: z.string().optional(),
});

export const expenseUpdateSchema = z.object({
  category: ExpenseCategoryEnum.optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
});

export const revenueCreateSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  description: z.string().optional().nullable(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("BRL"),
  date: z.string().optional(),
  status: RevenueStatusEnum.default("received"),
});

export const revenueUpdateSchema = z.object({
  description: z.string().optional().nullable(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
  status: RevenueStatusEnum.optional(),
});

export const bookingCreateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  clientId: z.string().min(1, "Client ID is required"),
  dealId: z.string().optional().nullable(),
  eventType: z.string().min(1, "Event type is required"),
  eventDate: z.string().min(1, "Event date is required"),
  duration: z.number().min(1).default(60),
  location: z.string().optional().nullable(),
  status: BookingStatusEnum.default("pending"),
  notes: z.string().optional().nullable(),
});

export const bookingUpdateSchema = z.object({
  eventType: z.string().min(1).optional(),
  eventDate: z.string().min(1).optional(),
  duration: z.number().min(1).optional(),
  location: z.string().optional().nullable(),
  status: BookingStatusEnum.optional(),
  notes: z.string().optional().nullable(),
});

export const documentCreateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  clientId: z.string().min(1),
  dealId: z.string().optional().nullable(),
  type: DocumentTypeEnum,
  title: z.string().min(1),
  filename: z.string().min(1),
  storageUrl: z.string().min(1),
});

export const packageCreateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  deliverables: z.string().min(1),
  duration: z.number().min(1),
  category: PackageCategoryEnum.default("photography"),
  active: z.boolean().default(true),
});

export const packageUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  deliverables: z.string().min(1).optional(),
  duration: z.number().min(1).optional(),
  category: PackageCategoryEnum.optional(),
  active: z.boolean().optional(),
});

export const proposalCreateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  clientId: z.string().min(1),
  dealId: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: ProposalStatusEnum.default("draft"),
  packages: z.string(),
  customItems: z.string().optional().nullable(),
  portfolioLinks: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  totalValue: z.number().min(0).default(0),
  currency: z.string().default("BRL"),
  notes: z.string().optional().nullable(),
});

export const proposalUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: ProposalStatusEnum.optional(),
  packages: z.string().optional(),
  customItems: z.string().optional().nullable(),
  portfolioLinks: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  totalValue: z.number().min(0).optional(),
  currency: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export const proposalTemplateCreateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  defaultTerms: z.string().optional().nullable(),
  defaultPackages: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// --- Helper ---

export function validateOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    throw new ValidationError(errors);
  }
  return result.data;
}

export class ValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super("Validation failed");
    this.errors = errors;
    this.name = "ValidationError";
  }
}

export function validationErrorResponse(error: ValidationError) {
  return NextResponse.json(
    { error: "Validation failed", details: error.errors },
    { status: 422 }
  );
}

export function validateOrigin(request: Request): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin && !host) return false;
  if (origin && host && !origin.includes(host)) return false;
  return true;
}
