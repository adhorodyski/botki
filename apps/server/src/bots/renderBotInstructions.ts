import type { BotId } from "@t3tools/contracts";

/** What the renderers need. The row and the file on disk each carry part of it. */
export interface BotBriefSource {
  readonly id: BotId;
  readonly name: string;
  readonly role: string;
  readonly brief: string;
}

/**
 * `BRIEF.md`: one role line, then the brief the owner wrote, verbatim. The DB row is
 * authoritative and this file is its portable export, so the export names the bot it came from
 * and carries no field the row lacks. Re-rendered on every edit, role line included.
 */
export function renderBrief(bot: BotBriefSource): string {
  return `# ${bot.name} (${bot.role})\n\n${bot.brief.trim()}\n`;
}

/**
 * The block a bot turn's prompt gains, composed from the row rather than the file so an unread
 * or hand-edited export cannot change what a turn is told.
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

/** Per-turn copy a provider process reads. One bot's threads stage the same bytes. */
export function instructionsRelativePath(botId: BotId): string {
  return `bot-instructions/${botId}.md`;
}
