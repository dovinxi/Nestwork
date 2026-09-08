import { Router } from "express";
import type { DraftMessageCreateInput } from "@nestwork/shared";
import { prisma } from "../prismaClient";
import { serializeDraftMessage } from "../serializers";

export const draftMessagesRouter = Router();

draftMessagesRouter.get("/", async (req, res) => {
  const { contactId } = req.query;
  const drafts = await prisma.draftMessage.findMany({
    where: contactId ? { contactId: String(contactId) } : undefined,
    orderBy: { createdAt: "desc" },
  });
  res.json(drafts.map(serializeDraftMessage));
});

/**
 * Phase 2: this will call an LLM to generate `draftText` from contact context
 * (notes, interactions, occasion). For now it only accepts manually-written drafts.
 */
draftMessagesRouter.post("/", async (req, res) => {
  const body = req.body as DraftMessageCreateInput;
  if (!body.contactId || !body.draftText) {
    return res.status(400).json({ error: "contactId and draftText are required" });
  }

  const draft = await prisma.draftMessage.create({
    data: {
      contactId: body.contactId,
      occasion: body.occasion,
      draftText: body.draftText,
      status: body.status ?? "draft",
      generatedByAI: false,
    },
  });

  res.status(201).json(serializeDraftMessage(draft));
});

draftMessagesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.draftMessage.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Draft not found" });
  await prisma.draftMessage.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
