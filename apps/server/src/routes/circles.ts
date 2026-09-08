import { Router } from "express";
import type { CircleCreateInput, CircleUpdateInput } from "@nestwork/shared";
import { prisma } from "../prismaClient";
import { serializeCircle } from "../serializers";

export const circlesRouter = Router();

circlesRouter.get("/", async (_req, res) => {
  const circles = await prisma.circle.findMany({ orderBy: { name: "asc" } });
  res.json(circles.map(serializeCircle));
});

circlesRouter.post("/", async (req, res) => {
  const body = req.body as CircleCreateInput;
  if (!body.name || !body.name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const existing = await prisma.circle.findUnique({ where: { name: body.name } });
  if (existing) return res.status(409).json({ error: "A circle with this name already exists" });

  const circle = await prisma.circle.create({
    data: { name: body.name, color: body.color },
  });
  res.status(201).json(serializeCircle(circle));
});

circlesRouter.put("/:id", async (req, res) => {
  const body = req.body as CircleUpdateInput;
  const existing = await prisma.circle.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Circle not found" });

  const circle = await prisma.circle.update({
    where: { id: req.params.id },
    data: { name: body.name, color: body.color },
  });
  res.json(serializeCircle(circle));
});

circlesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.circle.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Circle not found" });
  await prisma.circle.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
