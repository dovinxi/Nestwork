/**
 * A Relationship is an edge in the contact "web": a link between two contacts
 * (not between the user and a contact -- that's Contact.relationshipToMe).
 * This is what powers the graph view of who knows/is-connected-to whom.
 */
export interface Relationship {
  id: string;
  contactAId: string;
  contactBId: string;
  type: string; // free text, e.g. "sibling", "coworker", "introduced by"
  notes?: string;
  createdAt: string;
}

export type RelationshipCreateInput = Omit<Relationship, "id" | "createdAt">;
export type RelationshipUpdateInput = Partial<RelationshipCreateInput>;

/** Suggested relationship types shown in the UI; users can also type a custom one. */
export const SUGGESTED_RELATIONSHIP_TYPES = [
  "spouse",
  "partner",
  "sibling",
  "parent",
  "child",
  "cousin",
  "friend",
  "coworker",
  "introduced by",
  "mentor",
  "mentee",
] as const;
