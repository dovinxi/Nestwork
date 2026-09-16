import { Router } from "express";
import type {
  ContactUpdateSuggestion,
  DraftMessageInput,
  DraftMessageResult,
  ParseNoteInput,
  ParseNoteResult,
  SuggestedFieldUpdate,
} from "@nestwork/shared";
import { prisma } from "../prismaClient";
import { getAnthropicClient, PARSE_MODEL, DRAFT_MODEL } from "../anthropicClient";

export const aiRouter = Router();

const FIELD_LABELS: Record<SuggestedFieldUpdate["field"], string> = {
  company: "Company",
  jobTitle: "Job title",
  relationshipToMe: "Relationship to you",
  howWeMet: "How you met",
};

const PROPOSE_UPDATES_TOOL = {
  name: "propose_updates",
  description: "Propose structured contact-record updates extracted from a freeform note about the user's contacts.",
  input_schema: {
    type: "object" as const,
    properties: {
      suggestions: {
        type: "array",
        description: "One entry per existing contact the note is actually about. Omit anyone you aren't reasonably confident matches an existing contact.",
        items: {
          type: "object",
          properties: {
            contactId: { type: "string", description: "The id of the matched contact, copied exactly from the provided contact list." },
            interactionSummary: {
              type: "string",
              description: "A concise first-person-neutral summary of what happened, suitable to log verbatim as an interaction note.",
            },
            interactionImportant: {
              type: "boolean",
              description: "True only if the note describes something notably significant (major life event, urgent follow-up, etc.).",
            },
            fieldUpdates: {
              type: "array",
              description: "Only include a field here if the note reveals a NEW value that genuinely differs from the contact's current value.",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", enum: ["company", "jobTitle", "relationshipToMe", "howWeMet"] },
                  suggestedValue: { type: "string" },
                },
                required: ["field", "suggestedValue"],
              },
            },
            addTags: {
              type: "array",
              description: "Short freeform tags describing facts/traits worth remembering about this person (prefer reusing an existing tag name if one already fits).",
              items: { type: "string" },
            },
            addCircles: {
              type: "array",
              description: "Life-domain groupings this person belongs in (e.g. Work, Family) -- only if the note clearly implies one not already assigned.",
              items: { type: "string" },
            },
          },
          required: ["contactId", "interactionSummary", "interactionImportant", "fieldUpdates", "addTags", "addCircles"],
        },
      },
      unmatchedNames: {
        type: "array",
        description: "Names mentioned in the note that do NOT clearly match any contact in the provided list.",
        items: { type: "string" },
      },
    },
    required: ["suggestions", "unmatchedNames"],
  },
};

aiRouter.post("/parse-note", async (req, res) => {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return res.status(503).json({ error: "AI features aren't configured -- set ANTHROPIC_API_KEY on the server." });
  }

  const { text } = req.body as ParseNoteInput;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const contacts = await prisma.contact.findMany({
    select: { id: true, firstName: true, lastName: true, nickname: true, relationshipToMe: true, company: true, jobTitle: true },
  });
  const tags = await prisma.tag.findMany({ select: { id: true, name: true } });
  const circles = await prisma.circle.findMany({ select: { id: true, name: true } });
  const profile = await prisma.userProfile.findUnique({ where: { id: "me" }, select: { aiAboutMe: true } });

  if (!contacts.length) {
    return res.json({ suggestions: [], unmatchedNames: [] } satisfies ParseNoteResult);
  }

  const contactContext = contacts.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
    nickname: c.nickname ?? undefined,
    relationshipToMe: c.relationshipToMe ?? undefined,
    company: c.company ?? undefined,
    jobTitle: c.jobTitle ?? undefined,
  }));

  let message;
  try {
    message = await anthropic.messages.create({
      model: PARSE_MODEL,
      max_tokens: 2048,
      system:
        "You extract structured updates for a personal contact-management app from a short freeform note the user " +
        "just typed about their life/interactions. Today's date is " +
        new Date().toISOString().slice(0, 10) +
        ". Only propose an update for a contact you can match with reasonable confidence to the list below by name. " +
        "Never invent a contactId that isn't in the list. Be conservative: when in doubt, list the name under " +
        "unmatchedNames instead of guessing.\n\nExisting contacts:\n" +
        JSON.stringify(contactContext) +
        "\n\nExisting tags (prefer reusing these over inventing near-duplicates):\n" +
        JSON.stringify(tags.map((t) => t.name)) +
        "\n\nExisting circles:\n" +
        JSON.stringify(circles.map((c) => c.name)) +
        (profile?.aiAboutMe?.trim()
          ? "\n\nWhat the user has told you about themselves -- keep this in mind:\n" + profile.aiAboutMe.trim()
          : ""),
      tools: [PROPOSE_UPDATES_TOOL],
      tool_choice: { type: "tool", name: "propose_updates" },
      messages: [{ role: "user", content: text.trim() }],
    });
  } catch (err) {
    console.error("AI parse-note failed:", err);
    return res.status(502).json({ error: "Couldn't reach the AI service. Please try again." });
  }

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return res.status(502).json({ error: "The AI didn't return a usable response. Please try again." });
  }

  const raw = toolUse.input as {
    suggestions?: Array<{
      contactId: string;
      interactionSummary: string;
      interactionImportant: boolean;
      fieldUpdates?: Array<{ field: SuggestedFieldUpdate["field"]; suggestedValue: string }>;
      addTags?: string[];
      addCircles?: string[];
    }>;
    unmatchedNames?: string[];
  };

  const contactsById = new Map(contacts.map((c) => [c.id, c]));
  const tagsByLowerName = new Map(tags.map((t) => [t.name.toLowerCase(), t]));
  const circlesByLowerName = new Map(circles.map((c) => [c.name.toLowerCase(), c]));

  const suggestions: ContactUpdateSuggestion[] = (raw.suggestions ?? [])
    .filter((s) => contactsById.has(s.contactId))
    .map((s) => {
      const contact = contactsById.get(s.contactId)!;
      return {
        contactId: s.contactId,
        contactName: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
        interactionSummary: s.interactionSummary,
        interactionImportant: !!s.interactionImportant,
        fieldUpdates: (s.fieldUpdates ?? []).map((f) => ({
          field: f.field,
          label: FIELD_LABELS[f.field],
          currentValue: (contact as Record<string, unknown>)[f.field] as string | undefined,
          suggestedValue: f.suggestedValue,
        })),
        addTags: (s.addTags ?? []).map((name) => {
          const existing = tagsByLowerName.get(name.toLowerCase());
          return { name: existing?.name ?? name, existingTagId: existing?.id };
        }),
        addCircles: (s.addCircles ?? []).map((name) => {
          const existing = circlesByLowerName.get(name.toLowerCase());
          return { name: existing?.name ?? name, existingCircleId: existing?.id };
        }),
      };
    });

  res.json({ suggestions, unmatchedNames: raw.unmatchedNames ?? [] } satisfies ParseNoteResult);
});

aiRouter.post("/draft-message", async (req, res) => {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return res.status(503).json({ error: "AI features aren't configured -- set ANTHROPIC_API_KEY on the server." });
  }

  const { contactId, occasion } = req.body as DraftMessageInput;
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { tags: true },
  });
  if (!contact) return res.status(404).json({ error: "Contact not found" });

  const recentInteractions = await prisma.interaction.findMany({
    where: { contactId },
    orderBy: { date: "desc" },
    take: 5,
    select: { summary: true, date: true },
  });

  const profile = await prisma.userProfile.findUnique({
    where: { id: "me" },
    include: { writingSamples: { orderBy: { createdAt: "desc" } } },
  });

  // Prefer writing samples the user deliberately provided (Profile -> AI Assistant) --
  // a much stronger style signal than incidental past drafts. Fall back to recent drafts
  // (any contact) only when no explicit samples exist yet.
  const styleTexts = profile?.writingSamples.length
    ? profile.writingSamples.map((s) => s.text)
    : (
        await prisma.draftMessage.findMany({
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { draftText: true },
        })
      ).map((d) => d.draftText);

  const contextLines = [
    `Contact: ${contact.firstName} ${contact.lastName ?? ""}`.trim(),
    contact.relationshipToMe ? `Relationship to the user: ${contact.relationshipToMe}` : null,
    contact.howWeMet ? `How they met: ${contact.howWeMet}` : null,
    contact.tags.length ? `Tags: ${contact.tags.map((t) => t.name).join(", ")}` : null,
    recentInteractions.length
      ? `Recent interactions:\n${recentInteractions.map((i) => `- ${i.date.toISOString().slice(0, 10)}: ${i.summary}`).join("\n")}`
      : null,
    occasion?.trim() ? `Occasion for this message: ${occasion.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const aboutMeBlock = profile?.aiAboutMe?.trim()
    ? `\n\nWhat the user has told you about themselves -- keep this in mind:\n${profile.aiAboutMe.trim()}`
    : "";
  const styleBlock = styleTexts.length
    ? `\n\nHere are a few messages the user has written before, to match their tone and voice:\n${styleTexts
        .map((text, i) => `Example ${i + 1}:\n${text}`)
        .join("\n\n")}`
    : "";

  let message;
  try {
    message = await anthropic.messages.create({
      model: DRAFT_MODEL,
      max_tokens: 512,
      system:
        "You draft a short, warm, natural-sounding personal message (text or email) for the user to send to one " +
        "of their contacts, based on the context below. Match the user's own tone from their past messages when " +
        "examples are given, rather than defaulting to generic corporate-sounding language. Return only the " +
        "message text itself -- no preamble, no subject line, no quotation marks around it." +
        aboutMeBlock +
        styleBlock,
      messages: [{ role: "user", content: contextLines }],
    });
  } catch (err) {
    console.error("AI draft-message failed:", err);
    return res.status(502).json({ error: "Couldn't reach the AI service. Please try again." });
  }

  const textBlock = message.content.find((block) => block.type === "text");
  const draftText = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
  if (!draftText) {
    return res.status(502).json({ error: "The AI didn't return a usable draft. Please try again." });
  }

  res.json({ draftText } satisfies DraftMessageResult);
});
