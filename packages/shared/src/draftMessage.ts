/**
 * Phase 2 feature (AI-assisted message drafting). The shape is defined now so the
 * data model and API don't need breaking changes when it's built -- the
 * server route can stay stubbed until then.
 */
export type DraftMessageStatus = "draft" | "sent" | "discarded";

export interface DraftMessage {
  id: string;
  contactId: string;
  occasion?: string; // e.g. "birthday", "just checking in", "congrats on new job"
  draftText: string;
  status: DraftMessageStatus;
  generatedByAI: boolean;
  createdAt: string;
}

export type DraftMessageCreateInput = Omit<DraftMessage, "id" | "createdAt">;
