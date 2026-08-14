import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your CNIC or phone number."),
  password: z.string().min(1, "Enter your password."),
});

export const twoFactorVerifySchema = z
  .object({
    code: z.string().trim().min(6).max(10).optional(),
    recoveryCode: z.string().trim().min(6).max(20).optional(),
  })
  .refine((data) => data.code || data.recoveryCode, {
    message: "Enter your verification code or a recovery code.",
  });

export const totpConfirmSchema = z.object({
  code: z.string().trim().length(6, "Enter the 6-digit code from your authenticator app."),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm."),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(10, "New password must be at least 10 characters."),
});

export const passwordResetRequestSchema = z.object({
  identifier: z.string().min(3, "Enter your CNIC or phone number."),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(10, "New password must be at least 10 characters."),
});
