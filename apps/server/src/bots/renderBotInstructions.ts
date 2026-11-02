import type { BotId } from "@t3tools/contracts";

/** What the renderers need. The row and the file on disk each carry part of it. */
export interface BotBriefSource {
  readonly id: BotId;
  readonly name: string;
  readonly role: string;
  readonly brief: string;
}

/**
 * The brief the owner edits — what `BRIEF.md` holds verbatim. Plain markdown, no frontmatter:
 * the DB row is authoritative and this file is its portable export, so nothing in the file may
 * carry a transport field the row does not already have.
 */
export function renderBrief(bot: BotBriefSource): string {
  return `${bot.brief.trim()}\n`;
}

/**
 * The block a bot turn's prompt gains. The identity header tells the model whose instructions
 * these are; it is deliberately absent from `BRIEF.md`, so the file stays what the owner wrote.
 */
export function renderBotInstructions(bot: BotBriefSource): string {
  return [
    "<botki_bot_instructions>",
    `You are the "${bot.name}" bot (${bot.role}). Your brief lives in ${briefRelativePath(bot.id)} and applies to every turn of this thread.`,
    bot.brief.trim(),
    "</botki_bot_instructions>",
  ].join("\n");
}

/** Relative to the home dir the server was started with; compose with `join()`. */
export function botRelativeDirectory(botId: BotId): string {
  return `bots/${botId}`;
}

export function briefRelativePath(botId: BotId): string {
  return `${botRelativeDirectory(botId)}/BRIEF.md`;
}

/** Per-turn copy the provider process reads, staged fresh before every turn. */
export function instructionsRelativePath(botId: BotId): string {
  return `bot-instructions/${botId}.md`;
}
