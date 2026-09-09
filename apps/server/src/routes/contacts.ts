import { Router } from "express";
import type { ContactCreateInput, ContactUpdateInput, ProfileStat } from "@nestwork/shared";
import { prisma } from "../prismaClient";
import { serializeContact } from "../serializers";

export const contactsRouter = Router();

const CONTACT_INCLUDE = {
  emails: true,
  phones: true,
  addresses: true,
  tags: true,
  circles: true,
} as const;

function computeNextReminder(lastContactedAt?: string, frequencyDays?: number) {
  if (!lastContactedAt || !frequencyDays) return undefined;
  const next = new Date(lastContactedAt);
  next.setDate(next.getDate() + frequencyDays);
  return next;
}

contactsRouter.get("/", async (req, res) => {
  const { tagId, circleId, search } = req.query;
  const q = search ? String(search) : undefined;

  const contacts = await prisma.contact.findMany({
    where: {
      AND: [
        tagId ? { tags: { some: { id: String(tagId) } } } : {},
        circleId ? { circles: { some: { id: String(circleId) } } } : {},
        q
          ? {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { nickname: { contains: q } },
                { company: { contains: q } },
                { jobTitle: { contains: q } },
                { relationshipToMe: { contains: q } },
                { howWeMet: { contains: q } },
                { notes: { contains: q } },
                { tags: { some: { name: { contains: q } } } },
                { circles: { some: { name: { contains: q } } } },
                { emails: { some: { value: { contains: q } } } },
                { phones: { some: { value: { contains: q } } } },
                {
                  addresses: {
                    some: {
                      OR: [
                        { street: { contains: q } },
                        { city: { contains: q } },
                        { state: { contains: q } },
                        { postalCode: { contains: q } },
                        { country: { contains: q } },
                      ],
                    },
                  },
                },
                { interactions: { some: { summary: { contains: q } } } },
              ],
            }
          : {},
      ],
    },
    include: CONTACT_INCLUDE,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  res.json(contacts.map(serializeContact));
});

contactsRouter.get("/:id", async (req, res) => {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
    include: CONTACT_INCLUDE,
  });
  if (!contact) return res.status(404).json({ error: "Contact not found" });
  res.json(serializeContact(contact));
});

/**
 * Same "connectivity" definition as the profile's closest/furthest stats:
 * distinct other contacts linked via a logged Relationship or a shared Tag.
 */
contactsRouter.get("/:id/stats", async (req, res) => {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
    include: {
      tags: { select: { id: true } },
      relationshipsAsA: { select: { contactBId: true } },
      relationshipsAsB: { select: { contactAId: true } },
      interactions: { select: { id: true } },
    },
  });
  if (!contact) return res.status(404).json({ error: "Contact not found" });

  const connectedIds = new Set<string>();
  for (const rel of contact.relationshipsAsA) connectedIds.add(rel.contactBId);
  for (const rel of contact.relationshipsAsB) connectedIds.add(rel.contactAId);

  if (contact.tags.length) {
    const sharedTagContacts = await prisma.contact.findMany({
      where: {
        id: { not: contact.id },
        tags: { some: { id: { in: contact.tags.map((t) => t.id) } } },
      },
      select: { id: true },
    });
    for (const c of sharedTagContacts) connectedIds.add(c.id);
  }

  const stats: ProfileStat[] = [
    {
      id: "connections",
      label: "Connections",
      value: String(connectedIds.size),
      description: connectedIds.size === 1 ? "person shared in your web" : "people shared in your web",
    },
    {
      id: "interactions-logged",
      label: "Interactions Logged",
      value: String(contact.interactions.length),
      description: contact.interactions.length === 1 ? "thing remembered" : "things remembered",
    },
  ];

  res.json({ stats });
});

contactsRouter.post("/", async (req, res) => {
  const body = req.body as ContactCreateInput;

  if (!body.firstName || !body.firstName.trim()) {
    return res.status(400).json({ error: "firstName is required" });
  }

  const contact = await prisma.contact.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      nickname: body.nickname,
      photoUrl: body.photoUrl,
      birthday: body.birthday ? new Date(body.birthday) : undefined,
      company: body.company,
      jobTitle: body.jobTitle,
      relationshipToMe: body.relationshipToMe,
      howWeMet: body.howWeMet,
      notes: body.notes,
      keepInTouchFrequencyDays: body.keepInTouch?.frequencyDays,
      lastContactedAt: body.keepInTouch?.lastContactedAt ? new Date(body.keepInTouch.lastContactedAt) : undefined,
      nextReminderAt: computeNextReminder(body.keepInTouch?.lastContactedAt, body.keepInTouch?.frequencyDays),
      emails: body.emails?.length ? { create: body.emails } : undefined,
      phones: body.phones?.length ? { create: body.phones } : undefined,
      addresses: body.addresses?.length ? { create: body.addresses } : undefined,
      tags: body.tagIds?.length ? { connect: body.tagIds.map((id) => ({ id })) } : undefined,
      circles: body.circleIds?.length ? { connect: body.circleIds.map((id) => ({ id })) } : undefined,
    },
    include: CONTACT_INCLUDE,
  });

  res.status(201).json(serializeContact(contact));
});

contactsRouter.put("/:id", async (req, res) => {
  const body = req.body as ContactUpdateInput;
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Contact not found" });

  const nextLastContacted = body.keepInTouch?.lastContactedAt ?? existing.lastContactedAt?.toISOString();
  const nextFrequency = body.keepInTouch?.frequencyDays ?? existing.keepInTouchFrequencyDays ?? undefined;

  const contact = await prisma.contact.update({
    where: { id: req.params.id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      nickname: body.nickname,
      photoUrl: body.photoUrl,
      birthday: body.birthday ? new Date(body.birthday) : undefined,
      company: body.company,
      jobTitle: body.jobTitle,
      relationshipToMe: body.relationshipToMe,
      howWeMet: body.howWeMet,
      notes: body.notes,
      keepInTouchFrequencyDays: nextFrequency,
      lastContactedAt: nextLastContacted ? new Date(nextLastContacted) : undefined,
      nextReminderAt: computeNextReminder(nextLastContacted, nextFrequency ?? undefined),
      emails: body.emails
        ? { deleteMany: {}, create: body.emails }
        : undefined,
      phones: body.phones
        ? { deleteMany: {}, create: body.phones }
        : undefined,
      addresses: body.addresses
        ? { deleteMany: {}, create: body.addresses }
        : undefined,
      tags: body.tagIds ? { set: body.tagIds.map((id) => ({ id })) } : undefined,
      circles: body.circleIds ? { set: body.circleIds.map((id) => ({ id })) } : undefined,
    },
    include: CONTACT_INCLUDE,
  });

  res.json(serializeContact(contact));
});

contactsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Contact not found" });
  await prisma.contact.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

/** Mark a contact as "just contacted" -- resets lastContactedAt to now and rolls the reminder forward. */
contactsRouter.post("/:id/log-contact", async (req, res) => {
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Contact not found" });

  const now = new Date();
  const contact = await prisma.contact.update({
    where: { id: req.params.id },
    data: {
      lastContactedAt: now,
      nextReminderAt: computeNextReminder(now.toISOString(), existing.keepInTouchFrequencyDays ?? undefined),
    },
    include: CONTACT_INCLUDE,
  });

  res.json(serializeContact(contact));
});
