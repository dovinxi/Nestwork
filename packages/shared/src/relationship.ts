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

/** A user-editable label offered in the Relationship "type" dropdown -- seeded with defaults, editable from Categories. */
export interface RelationshipType {
  id: string;
  name: string;
  createdAt: string;
}

export type RelationshipTypeCreateInput = Omit<RelationshipType, "id" | "createdAt">;
