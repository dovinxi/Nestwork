import { Router } from "express";
import type { TagCreateInput, TagUpdateInput } from "@nestwork/shared";
import { prisma } from "../prismaClient";
import { serializeTag } from "../serializers";

export const tagsRouter = Router();

tagsRouter.get("/", async (_req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  res.json(tags.map(serializeTag));
});

tagsRouter.post("/", async (req, res) => {
  const body = req.body as TagCreateInput;
  if (!body.name || !body.name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const existing = await prisma.tag.findUnique({ where: { name: body.name } });
  if (existing) return res.status(409).json({ error: "A tag with this name already exists" });

  const tag = await prisma.tag.create({
    data: { name: body.name, color: body.color },
  });
  res.status(201).json(serializeTag(tag));
});

tagsRouter.put("/:id", async (req, res) => {
  const body = req.body as TagUpdateInput;
  const existing = await prisma.tag.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Tag not found" });

  const tag = await prisma.tag.update({
    where: { id: req.params.id },
    data: { name: body.name, color: body.color },
  });
  res.json(serializeTag(tag));
});

tagsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.tag.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Tag not found" });
  await prisma.tag.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
