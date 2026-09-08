import { Router } from "express";
import type { UserProfile, UserProfileUpdateInput } from "@nestwork/shared";
import { prisma } from "../prismaClient";

export const profileRouter = Router();

function serializeProfile(profile: { id: string; name: string; photoUrl: string | null; updatedAt: Date }): UserProfile {
  return {
    id: "me",
    name: profile.name,
    photoUrl: profile.photoUrl ?? undefined,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

profileRouter.get("/", async (_req, res) => {
  const profile = await prisma.userProfile.upsert({
    where: { id: "me" },
    update: {},
    create: { id: "me" },
  });
  res.json(serializeProfile(profile));
});

profileRouter.put("/", async (req, res) => {
  const body = req.body as UserProfileUpdateInput;
  const profile = await prisma.userProfile.upsert({
    where: { id: "me" },
    update: { name: body.name, photoUrl: body.photoUrl },
    create: { id: "me", name: body.name ?? "Me", photoUrl: body.photoUrl },
  });
  res.json(serializeProfile(profile));
});
