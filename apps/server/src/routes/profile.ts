import { Router } from "express";
import type { UserProfile, UserProfileUpdateInput } from "@nestwork/shared";
import { prisma } from "../prismaClient";

export const profileRouter = Router();

const PROFILE_INCLUDE = { writingSamples: true } as const;

function serializeProfile(profile: {
  id: string;
  name: string;
  photoUrl: string | null;
  aiAboutMe: string | null;
  updatedAt: Date;
  writingSamples: { id: string; text: string }[];
}): UserProfile {
  return {
    id: "me",
    name: profile.name,
    photoUrl: profile.photoUrl ?? undefined,
    aiAboutMe: profile.aiAboutMe ?? undefined,
    writingSamples: profile.writingSamples.map((s) => ({ id: s.id, text: s.text })),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

profileRouter.get("/", async (_req, res) => {
  const profile = await prisma.userProfile.upsert({
    where: { id: "me" },
    update: {},
    create: { id: "me" },
    include: PROFILE_INCLUDE,
  });
  res.json(serializeProfile(profile));
});

profileRouter.put("/", async (req, res) => {
  const body = req.body as UserProfileUpdateInput;
  const profile = await prisma.userProfile.upsert({
    where: { id: "me" },
    update: {
      name: body.name,
      photoUrl: body.photoUrl,
      aiAboutMe: body.aiAboutMe,
      writingSamples: body.writingSamples ? { deleteMany: {}, create: body.writingSamples } : undefined,
    },
    create: {
      id: "me",
      name: body.name ?? "Me",
      photoUrl: body.photoUrl,
      aiAboutMe: body.aiAboutMe,
      writingSamples: body.writingSamples ? { create: body.writingSamples } : undefined,
    },
    include: PROFILE_INCLUDE,
  });
  res.json(serializeProfile(profile));
});
