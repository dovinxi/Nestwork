import type { Contact as SharedContact, Relationship as SharedRelationship, Interaction as SharedInteraction, Tag as SharedTag, Circle as SharedCircle, DraftMessage as SharedDraftMessage } from "@nestwork/shared";
import type { Contact, ContactEmail, ContactPhone, ContactAddress, Tag, Circle, Relationship, Interaction, DraftMessage } from "@prisma/client";

type ContactWithRelations = Contact & {
  emails: ContactEmail[];
  phones: ContactPhone[];
  addresses: ContactAddress[];
  tags: Tag[];
  circles: Circle[];
};

export function serializeContact(contact: ContactWithRelations): SharedContact {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName ?? undefined,
    nickname: contact.nickname ?? undefined,
    photoUrl: contact.photoUrl ?? undefined,
    emails: contact.emails.map((e) => ({ id: e.id, label: e.label, value: e.value })),
    phones: contact.phones.map((p) => ({ id: p.id, label: p.label, value: p.value })),
    addresses: contact.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      street: a.street ?? undefined,
      city: a.city ?? undefined,
      state: a.state ?? undefined,
      postalCode: a.postalCode ?? undefined,
      country: a.country ?? undefined,
    })),
    birthday: contact.birthday?.toISOString(),
    company: contact.company ?? undefined,
    jobTitle: contact.jobTitle ?? undefined,
    relationshipToMe: contact.relationshipToMe ?? undefined,
    howWeMet: contact.howWeMet ?? undefined,
    notes: contact.notes ?? undefined,
    keepInTouch: {
      frequencyDays: contact.keepInTouchFrequencyDays ?? undefined,
      lastContactedAt: contact.lastContactedAt?.toISOString(),
      nextReminderAt: contact.nextReminderAt?.toISOString(),
    },
    tagIds: contact.tags.map((t) => t.id),
    circleIds: contact.circles.map((c) => c.id),
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export function serializeTag(tag: Tag): SharedTag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt.toISOString(),
  };
}

export function serializeCircle(circle: Circle): SharedCircle {
  return {
    id: circle.id,
    name: circle.name,
    color: circle.color,
    createdAt: circle.createdAt.toISOString(),
  };
}

export function serializeRelationship(rel: Relationship): SharedRelationship {
  return {
    id: rel.id,
    contactAId: rel.contactAId,
    contactBId: rel.contactBId,
    type: rel.type,
    notes: rel.notes ?? undefined,
    createdAt: rel.createdAt.toISOString(),
  };
}

export function serializeInteraction(interaction: Interaction): SharedInteraction {
  return {
    id: interaction.id,
    contactId: interaction.contactId,
    date: interaction.date.toISOString(),
    type: interaction.type as SharedInteraction["type"],
    summary: interaction.summary,
    important: interaction.important,
    createdAt: interaction.createdAt.toISOString(),
  };
}

export function serializeDraftMessage(draft: DraftMessage): SharedDraftMessage {
  return {
    id: draft.id,
    contactId: draft.contactId,
    occasion: draft.occasion ?? undefined,
    draftText: draft.draftText,
    status: draft.status as SharedDraftMessage["status"],
    generatedByAI: draft.generatedByAI,
    createdAt: draft.createdAt.toISOString(),
  };
}
