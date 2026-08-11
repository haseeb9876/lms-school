import { z } from 'zod';

// Define the schema for school settings
export const schoolSettingsSchema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  tagline: z.string().optional(),
});

export type SchoolSettings = z.infer<typeof schoolSettingsSchema>;
