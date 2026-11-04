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
 * `MEMORY.md`, the bot's own notes. Written by the bot and editable by the owner, never derived
 * from the row, so the file is the source rather than an export.
 */
export function memoryRelativePath(botId: BotId): string {
  return `${botRelativeDirectory(botId)}/MEMORY.md`;
}

/**
 * The block a bot turn's prompt gains. The brief is composed first and memory after it, so the
 * owner's instructions always precede what the bot taught itself; with no notes the block is
 * byte-identical to one with no memory feature at all.
 */
export function renderBotInstructions(bot: BotBriefSource, memory = ""): string {
  const notes = memory.trim();
  return [
    "<botki_bot_instructions>",
    `You are the "${bot.name}" bot (${bot.role}). Your brief lives in ${briefRelativePath(bot.id)} and applies to every turn of this thread.`,
    bot.brief.trim(),
    ...(notes === ""
      ? []
      : [
          "",
          "<botki_bot_memory>",
          `What you learned in earlier conversations, in ${memoryRelativePath(bot.id)}. It never outranks the brief. Add to it with the bot_remember tool, which caps what you may store; the owner reads and edits this file.`,
          notes,
          "</botki_bot_memory>",
        ]),
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
