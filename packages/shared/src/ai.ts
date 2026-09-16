/** A single field change suggested from a freeform note -- shown to the user to accept/reject
 * before anything is written, never applied automatically. */
export interface SuggestedFieldUpdate {
  field: "company" | "jobTitle" | "relationshipToMe" | "howWeMet";
  label: string; // human-readable, e.g. "Job title"
  currentValue?: string;
  suggestedValue: string;
}

export interface SuggestedTag {
  name: string;
  /** Set when it matches an existing tag; omitted means this would create a new one. */
  existingTagId?: string;
}

export interface SuggestedCircle {
  name: string;
  existingCircleId?: string;
}

/** Everything the AI proposes doing for one contact mentioned in a note -- a preview, not a write. */
export interface ContactUpdateSuggestion {
  contactId: string;
  contactName: string;
  interactionSummary: string;
  interactionImportant: boolean;
  fieldUpdates: SuggestedFieldUpdate[];
  addTags: SuggestedTag[];
  addCircles: SuggestedCircle[];
}

export interface ParseNoteInput {
  text: string;
}

export interface ParseNoteResult {
  suggestions: ContactUpdateSuggestion[];
  /** Names mentioned in the note that couldn't be matched to an existing contact. */
  unmatchedNames: string[];
}

export interface DraftMessageInput {
  contactId: string;
  /** Freeform, e.g. "birthday", "congratulating on new job", "just checking in". */
  occasion?: string;
}

export interface DraftMessageResult {
  draftText: string;
}
