import { Router } from "express";
import type { InteractionCreateInput, InteractionUpdateInput } from "@nestwork/shared";
import { prisma } from "../prismaClient";
import { serializeInteraction } from "../serializers";

export const interactionsRouter = Router();

interactionsRouter.get("/", async (req, res) => {
  const { contactId } = req.query;
  const interactions = await prisma.interaction.findMany({
    where: contactId ? { contactId: String(contactId) } : undefined,
    orderBy: { date: "desc" },
  });
  res.json(interactions.map(serializeInteraction));
});

interactionsRouter.post("/", async (req, res) => {
  const body = req.body as InteractionCreateInput;
  if (!body.contactId || !body.summary) {
    return res.status(400).json({ error: "contactId and summary are required" });
  }

  const interaction = await prisma.interaction.create({
    data: {
      contactId: body.contactId,
      date: body.date ? new Date(body.date) : new Date(),
      type: body.type ?? "note",
      summary: body.summary,
      important: body.important ?? false,
    },
  });

  res.status(201).json(serializeInteraction(interaction));
});

interactionsRouter.put("/:id", async (req, res) => {
  const body = req.body as InteractionUpdateInput;
  const existing = await prisma.interaction.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Interaction not found" });

  const interaction = await prisma.interaction.update({
    where: { id: req.params.id },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      type: body.type,
      summary: body.summary,
      important: body.important,
    },
  });

  res.json(serializeInteraction(interaction));
});

interactionsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.interaction.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Interaction not found" });
  await prisma.interaction.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
