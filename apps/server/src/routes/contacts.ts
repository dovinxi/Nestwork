import { Router } from "express";
import type { ContactCreateInput, ContactUpdateInput } from "@nestwork/shared";
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

  const contacts = await prisma.contact.findMany({
    where: {
      AND: [
        tagId ? { tags: { some: { id: String(tagId) } } } : {},
        circleId ? { circles: { some: { id: String(circleId) } } } : {},
        search
          ? {
              OR: [
                { firstName: { contains: String(search) } },
                { lastName: { contains: String(search) } },
                { nickname: { contains: String(search) } },
                { company: { contains: String(search) } },
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
