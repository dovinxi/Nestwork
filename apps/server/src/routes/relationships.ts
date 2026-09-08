import { Router } from "express";
import type { RelationshipCreateInput, RelationshipUpdateInput } from "@nestwork/shared";
import { prisma } from "../prismaClient";
import { serializeRelationship } from "../serializers";

export const relationshipsRouter = Router();

/** Full edge list for the relationship web view. Optionally scoped to one contact's neighborhood. */
relationshipsRouter.get("/", async (req, res) => {
  const { contactId } = req.query;

  const relationships = await prisma.relationship.findMany({
    where: contactId
      ? { OR: [{ contactAId: String(contactId) }, { contactBId: String(contactId) }] }
      : undefined,
    orderBy: { createdAt: "desc" },
  });

  res.json(relationships.map(serializeRelationship));
});

relationshipsRouter.post("/", async (req, res) => {
  const body = req.body as RelationshipCreateInput;
  if (!body.contactAId || !body.contactBId || !body.type) {
    return res.status(400).json({ error: "contactAId, contactBId, and type are required" });
  }
  if (body.contactAId === body.contactBId) {
    return res.status(400).json({ error: "A contact cannot have a relationship with themselves" });
  }

  const relationship = await prisma.relationship.create({
    data: {
      contactAId: body.contactAId,
      contactBId: body.contactBId,
      type: body.type,
      notes: body.notes,
    },
  });

  res.status(201).json(serializeRelationship(relationship));
});

relationshipsRouter.put("/:id", async (req, res) => {
  const body = req.body as RelationshipUpdateInput;
  const existing = await prisma.relationship.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Relationship not found" });

  const relationship = await prisma.relationship.update({
    where: { id: req.params.id },
    data: { type: body.type, notes: body.notes },
  });

  res.json(serializeRelationship(relationship));
});

relationshipsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.relationship.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Relationship not found" });
  await prisma.relationship.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
