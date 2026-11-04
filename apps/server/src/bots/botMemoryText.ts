import type { BotId } from "@t3tools/contracts";
import { BOT_MEMORY_MAX_CHARS, BotMemoryError } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import type { FileSystem } from "effect/FileSystem";
import * as Schema from "effect/Schema";
import type * as Path from "effect/Path";

import { memoryRelativePath } from "./renderBotInstructions.ts";

/**
 * `MEMORY.md`, the one file a bot writes about itself. A module rather than a service, because
 * the turn path reads it and the owner's edit path writes it: a service tag would add a
 * requirement to every layer graph that starts a turn, for a file.
 */
export interface BotMemoryFile {
  readonly read: (botId: BotId) => Effect.Effect<string>;
  /** Empty text removes the file, so a cleared memory leaves nothing behind. */
  readonly write: (botId: BotId, text: string) => Effect.Effect<string, BotMemoryError>;
  readonly pathOf: (botId: BotId) => string;
}

export function makeBotMemoryFile(
  fileSystem: FileSystem,
  path: Path.Path,
  baseDir: string,
): BotMemoryFile {
  const pathOf = (botId: BotId) => path.join(baseDir, memoryRelativePath(botId));
  const unwritable = (botId: BotId, cause: unknown) =>
    new BotMemoryError({ botId, failure: "bot_memory_unwritable", cause });

  return {
    pathOf,
    write: Effect.fn("BotMemoryFile.write")(function* (botId: BotId, text: string) {
      const target = pathOf(botId);
      if (text === "") {
        yield* fileSystem
          .remove(target, { force: true })
          .pipe(Effect.mapError((cause) => unwritable(botId, cause)));
        return text;
      }
      yield* fileSystem.makeDirectory(path.dirname(target), { recursive: true }).pipe(
        Effect.andThen(fileSystem.writeFileString(target, `${text}\n`)),
        Effect.mapError((cause) => unwritable(botId, cause)),
      );
      return text;
    }),
    // Trimmed, so the owner edits exactly the bytes a turn is given. A bot that has written
    // nothing has learned nothing, so an unreadable file reads as an empty one: the brief still
    // reaches the turn, which is the part that must not go missing.
    read: (botId) =>
      fileSystem.readFileString(pathOf(botId)).pipe(
        Effect.map((text) => text.trim()),
        Effect.orElseSucceed(() => ""),
      ),
  };
}

/**
 * The cap, applied to a bot's own note and to an owner's edit alike. Refusing rather than
 * trimming is the point: a file that silently shrank would take the brief down with it.
 */
export const memoryFits = (text: string): boolean => text.length <= BOT_MEMORY_MAX_CHARS;

/** Compiled once, so a caller can tell a refusal it should explain from a failure it cannot. */
export const isBotMemoryError = Schema.is(BotMemoryError);

export const isCapRefusal = (cause: unknown): cause is BotMemoryError =>
  isBotMemoryError(cause) && cause.failure === "bot_memory_too_large";

/** Newest last, one line per note, so the file reads as a list rather than a blob. */
export function appendNote(existing: string, note: string): string {
  const lines = existing.trim() === "" ? [] : existing.trim().split("\n");
  return [...lines, `- ${note.trim().replace(/\s+/g, " ")}`].join("\n");
}
