import { Router } from "express";
import type { RelationshipTypeCreateInput } from "@nestwork/shared";
import { prisma } from "../prismaClient";
import { serializeRelationshipType } from "../serializers";

export const relationshipTypesRouter = Router();

relationshipTypesRouter.get("/", async (_req, res) => {
  const types = await prisma.relationshipType.findMany({ orderBy: { name: "asc" } });
  res.json(types.map(serializeRelationshipType));
});

relationshipTypesRouter.post("/", async (req, res) => {
  const body = req.body as RelationshipTypeCreateInput;
  if (!body.name || !body.name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const existing = await prisma.relationshipType.findUnique({ where: { name: body.name } });
  if (existing) return res.status(409).json({ error: "A relationship type with this name already exists" });

  const type = await prisma.relationshipType.create({ data: { name: body.name } });
  res.status(201).json(serializeRelationshipType(type));
});

relationshipTypesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.relationshipType.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Relationship type not found" });
  await prisma.relationshipType.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
