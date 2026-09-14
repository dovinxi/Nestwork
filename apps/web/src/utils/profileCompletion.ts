import type { Contact } from "@nestwork/shared";

/** One point per field below -- the checklist that drives the profile completion bar. */
const FIELDS: { label: string; done: (c: Contact) => boolean }[] = [
  { label: "Last name", done: (c) => !!c.lastName },
  { label: "Nickname", done: (c) => !!c.nickname },
  { label: "Photo", done: (c) => !!c.photoUrl },
  { label: "Birthday", done: (c) => !!c.birthday },
  { label: "Company", done: (c) => !!c.company },
  { label: "Job title", done: (c) => !!c.jobTitle },
  { label: "Relationship to me", done: (c) => !!c.relationshipToMe },
  { label: "How we met", done: (c) => !!c.howWeMet },
  { label: "Notes", done: (c) => !!c.notes },
  { label: "Email", done: (c) => c.emails.length > 0 },
  { label: "Phone", done: (c) => c.phones.length > 0 },
  { label: "Address", done: (c) => c.addresses.length > 0 },
  { label: "Tags", done: (c) => c.tagIds.length > 0 },
  { label: "Circles", done: (c) => c.circleIds.length > 0 },
  { label: "Keep-in-touch reminder", done: (c) => !!c.keepInTouch.frequencyDays },
];

export interface ProfileCompletion {
  completed: number;
  total: number;
  missing: string[];
}

export function getProfileCompletion(contact: Contact): ProfileCompletion {
  const missing: string[] = [];
  let completed = 0;
  for (const field of FIELDS) {
    if (field.done(contact)) completed += 1;
    else missing.push(field.label);
  }
  return { completed, total: FIELDS.length, missing };
}
