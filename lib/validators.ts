import { z } from "zod";
import { CLAIM_PRIORITIES, NOTE_KINDS } from "@/types/security-claim";

export const claimIntakeSchema = z.object({
  policyholder: z.string().min(2, "Policyholder is required."),
  incidentType: z.string().min(2, "Incident type is required."),
  dateTime: z.string().min(1, "Incident date and time is required."),
  location: z.string().min(5, "Location is required."),
  securityVendor: z.string().min(2, "Security vendor is required."),
  policeReportNumber: z.string().min(1, "Police report number is required."),
  lawEnforcementContact: z.string().min(2, "Law enforcement contact is required."),
  cctvAvailable: z.preprocess((value) => value === "true" || value === true, z.boolean()),
  propertyType: z.string().min(2, "Property type is required."),
  description: z.string().min(20, "Please include a fuller loss description."),
  priority: z.enum(CLAIM_PRIORITIES),
  assignedAdjuster: z.string().optional().default(""),
});

export const noteSchema = z.object({
  body: z.string().min(3, "Note cannot be empty."),
  author: z.string().min(2, "Author is required."),
  kind: z.enum(NOTE_KINDS).default("note"),
});

export const taskCompletionSchema = z.object({
  completedBy: z.string().min(2, "Completed by is required."),
});

export const transitionSchema = z.object({
  author: z.string().min(2, "Author is required."),
  note: z.string().optional().default(""),
});

export type ClaimIntakeInput = z.infer<typeof claimIntakeSchema>;
export type ClaimNoteInput = z.infer<typeof noteSchema>;
export type TaskCompletionInput = z.infer<typeof taskCompletionSchema>;
export type ClaimTransitionInput = z.infer<typeof transitionSchema>;
