import { z } from "zod";
import { isValidHexColor, isBrandColorAccessible } from "@/lib/color";

export const brandingUpdateSchema = z.object({
  schoolName: z.string().trim().min(2, "School name must be at least 2 characters.").max(100),
  primaryColor: z
    .string()
    .trim()
    .refine(isValidHexColor, "Enter a valid hex color, e.g. #0E6E68.")
    .refine(isBrandColorAccessible, "That color is too light/dark to read text on. Pick something with more contrast."),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
  website: z.string().trim().url("Enter a valid URL, e.g. https://myschool.edu.pk").optional().or(z.literal("")),
});
