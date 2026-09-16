import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null | undefined;

/** Lazily constructed so a missing key doesn't crash the whole server at boot --
 * only the AI routes need it, and they report a clear error when it's absent. */
export function getAnthropicClient(): Anthropic | null {
  if (client !== undefined) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  client = apiKey ? new Anthropic({ apiKey }) : null;
  return client;
}

export const PARSE_MODEL = "claude-haiku-4-5-20251001";
export const DRAFT_MODEL = "claude-sonnet-5";
