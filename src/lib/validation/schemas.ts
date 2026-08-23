import { z } from "zod";
import { businessTypes } from "@/config/business-types";

const trimmed = (max: number) => z.string().trim().max(max);

export const emailSchema = trimmed(200)
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords can be at most 72 characters.");

export const phoneSchema = trimmed(40).refine(
  (value) => value.replace(/\D/g, "").length >= 7,
  "Enter a valid phone number.",
);

const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .refine(
    (value) => value === undefined || /^https?:\/\/\S+\.\S+/.test(value),
    "Start with http:// or https://",
  );

export const signUpSchema = z.object({
  businessName: trimmed(160).min(2, "Enter your business name."),
  ownerName: trimmed(120).min(2, "Enter your name."),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  businessType: z.enum(businessTypes, {
    message: "Choose a business type.",
  }),
  website: optionalUrl,
  plan: z.enum(["starter", "business", "pro"]).default("starter"),
});

export const logInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const activateTagSchema = z.object({
  code: trimmed(12)
    .min(6, "Enter the tag ID printed on the tag.")
    .regex(/^[A-Za-z0-9-]+$/, "Tag IDs use letters and numbers only."),
  customerName: trimmed(120).min(2, "Enter the customer's name."),
  customerPhone: trimmed(40).optional(),
  customerEmail: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value === "" ? undefined : value.toLowerCase()))
    .optional()
    .refine(
      (value) => value === undefined || z.string().email().safeParse(value).success,
      "Enter a valid email address.",
    ),
  productName: trimmed(160).min(2, "Enter what you installed."),
  installedOn: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the installation date."),
  warrantyExpiresOn: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional()
    .refine(
      (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Choose a valid date.",
    ),
  notes: trimmed(2000).optional(),
});

export const serviceRequestSchema = z.object({
  name: trimmed(120).min(2, "Enter your name."),
  phone: phoneSchema,
  message: trimmed(2000).min(4, "Tell us what you need help with."),
  photoUrl: z.string().trim().max(500).optional(),
  kind: z.enum(["service", "appointment"]).default("service"),
});

export const businessSettingsSchema = z.object({
  name: trimmed(160).min(2, "Enter your business name."),
  businessType: z.enum(businessTypes),
  phone: phoneSchema,
  email: emailSchema,
  website: optionalUrl,
  bookingUrl: optionalUrl,
  about: trimmed(400).optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type ActivateTagInput = z.infer<typeof activateTagSchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
