export interface ContactEmail {
  id: string;
  label: string; // e.g. "personal", "work"
  value: string;
}

export interface ContactPhone {
  id: string;
  label: string; // e.g. "mobile", "home"
  value: string;
}

export interface ContactAddress {
  id: string;
  label: string; // e.g. "home", "work"
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** How often the user wants to stay in touch, and where things stand. */
export interface KeepInTouch {
  frequencyDays?: number; // e.g. 30 = "every month". Undefined = no cadence set.
  lastContactedAt?: string; // ISO date
  nextReminderAt?: string; // ISO date, derived from lastContactedAt + frequencyDays
}

export interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photoUrl?: string;

  emails: ContactEmail[];
  phones: ContactPhone[];
  addresses: ContactAddress[];

  birthday?: string; // ISO date
  company?: string;
  jobTitle?: string;

  /** Free-text description of the user's relationship to this person, e.g. "college roommate", "cousin". */
  relationshipToMe?: string;
  howWeMet?: string;

  /** Freeform notes / things to remember about this person. */
  notes?: string;

  keepInTouch: KeepInTouch;

  /** "What I know about them" -- freeform attributes. */
  tagIds: string[];
  /** "Where they fit in my life" -- life-domain groupings; a contact may belong to several. */
  circleIds: string[];

  createdAt: string;
  updatedAt: string;
}

export type ContactCreateInput = Omit<Contact, "id" | "createdAt" | "updatedAt" | "emails" | "phones" | "addresses" | "tagIds" | "circleIds" | "keepInTouch"> & {
  emails?: Omit<ContactEmail, "id">[];
  phones?: Omit<ContactPhone, "id">[];
  addresses?: Omit<ContactAddress, "id">[];
  tagIds?: string[];
  circleIds?: string[];
  keepInTouch?: KeepInTouch;
};

export type ContactUpdateInput = Partial<ContactCreateInput>;
