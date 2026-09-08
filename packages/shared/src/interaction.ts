export type InteractionType = "call" | "meeting" | "message" | "gift" | "note" | "other";

/**
 * A logged touchpoint or a "thing to remember" about a contact.
 * Marking one as `important` surfaces it prominently on the contact's profile
 * (e.g. "allergic to peanuts", "just started a new job").
 */
export interface Interaction {
  id: string;
  contactId: string;
  date: string; // ISO date
  type: InteractionType;
  summary: string;
  important: boolean;
  createdAt: string;
}

export type InteractionCreateInput = Omit<Interaction, "id" | "createdAt">;
export type InteractionUpdateInput = Partial<InteractionCreateInput>;
