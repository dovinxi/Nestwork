import { Router } from "express";
import type { ProfileStat } from "@nestwork/shared";
import { prisma } from "../prismaClient";

export const statsRouter = Router();

const NOT_ENOUGH_DATA = "Add a few more contacts to see this";
const NO_LINKS_YET = "Log a relationship or shared tag to see this";

/**
 * "Connectivity" = how many *other* contacts a person is linked to in the
 * relationship web, via either a logged Relationship or a shared Tag.
 * Closest = the most interconnected node; furthest = the most isolated one.
 */
statsRouter.get("/", async (_req, res) => {
  const contacts = await prisma.contact.findMany({
    include: { tags: true, relationshipsAsA: true, relationshipsAsB: true },
    orderBy: { firstName: "asc" },
  });

  const stats: ProfileStat[] = [
    {
      id: "total-connections",
      label: "Total Connections",
      value: String(contacts.length),
      description: contacts.length === 1 ? "person in your nest" : "people in your nest",
    },
  ];

  if (contacts.length < 2) {
    stats.push({ id: "closest-connection", label: "Closest Connection", value: "—", description: NOT_ENOUGH_DATA });
    stats.push({ id: "furthest-connection", label: "Furthest Connection", value: "—", description: NOT_ENOUGH_DATA });
    return res.json({ stats });
  }

  const linked = new Map<string, Set<string>>();
  for (const c of contacts) linked.set(c.id, new Set());

  for (const c of contacts) {
    for (const rel of c.relationshipsAsA) linked.get(c.id)!.add(rel.contactBId);
    for (const rel of c.relationshipsAsB) linked.get(c.id)!.add(rel.contactAId);
  }

  const tagToContactIds = new Map<string, string[]>();
  for (const c of contacts) {
    for (const tag of c.tags) {
      if (!tagToContactIds.has(tag.id)) tagToContactIds.set(tag.id, []);
      tagToContactIds.get(tag.id)!.push(c.id);
    }
  }
  for (const ids of tagToContactIds.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        linked.get(ids[i])!.add(ids[j]);
        linked.get(ids[j])!.add(ids[i]);
      }
    }
  }

  const scored = contacts.map((c) => ({ contact: c, score: linked.get(c.id)!.size }));
  const maxScore = Math.max(...scored.map((s) => s.score));

  if (maxScore === 0) {
    stats.push({ id: "closest-connection", label: "Closest Connection", value: "—", description: NO_LINKS_YET });
    stats.push({ id: "furthest-connection", label: "Furthest Connection", value: "—", description: NO_LINKS_YET });
    return res.json({ stats });
  }

  const byNameAsc = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    a.contact.firstName.localeCompare(b.contact.firstName);

  const closest = scored.filter((s) => s.score === maxScore).sort(byNameAsc)[0];
  stats.push({
    id: "closest-connection",
    label: "Closest Connection",
    value: `${closest.contact.firstName} ${closest.contact.lastName ?? ""}`.trim(),
    contactId: closest.contact.id,
    description: `${maxScore} shared connection${maxScore === 1 ? "" : "s"} in your web`,
  });

  const minScore = Math.min(...scored.map((s) => s.score));
  const furthest = scored.filter((s) => s.score === minScore).sort(byNameAsc)[0];
  stats.push({
    id: "furthest-connection",
    label: "Furthest Connection",
    value: `${furthest.contact.firstName} ${furthest.contact.lastName ?? ""}`.trim(),
    contactId: furthest.contact.id,
    description: minScore === 0 ? "Not linked to anyone else yet" : `${minScore} shared connection${minScore === 1 ? "" : "s"}`,
  });

  res.json({ stats });
});
