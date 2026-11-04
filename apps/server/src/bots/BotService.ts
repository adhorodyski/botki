import type { Bot, BotId, BotMutation } from "@t3tools/contracts";
import {
  BOT_MEMORY_MAX_CHARS,
  BotMemoryError,
  BotMutationError,
  botIdFromName,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import * as SqlError from "effect/sql/SqlError";

import * as ServerConfig from "../config.ts";
import { appendNote, makeBotMemoryFile, memoryFits } from "./botMemoryText.ts";
import { briefRelativePath, renderBrief } from "./renderBotInstructions.ts";

interface BotRow {
  readonly bot_id: string;
  readonly name: string;
  readonly role: string;
  readonly brief: string;
  readonly provider_instance_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

// The column types already are the contract's; only the branded id needs naming.
function botFromRow(row: BotRow): Bot {
  return {
    id: row.bot_id as BotId,
    name: row.name,
    role: row.role,
    brief: row.brief,
    providerInstanceId: row.provider_instance_id as Bot["providerInstanceId"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `bots` has one constraint, the primary key on bot_id, so any constraint violation on the
// insert means the slug is taken. node:sqlite reports a WITHOUT ROWID primary key as
// ConstraintError rather than UniqueViolation, so both tags count.
const isSlugTaken = (cause: unknown): boolean =>
  SqlError.isSqlError(cause) &&
  (cause.reason._tag === "UniqueViolation" || cause.reason._tag === "ConstraintError");

// SqlClient's error channel is untyped, so every bot query names its failure here.
const botServiceError = (cause: unknown) => new BotServiceError({ cause });

export class BotServiceError extends Schema.TaggedError<BotServiceError>()("BotServiceError", {
  cause: Schema.optional(Schema.Defect()),
}) {
  override get message(): string {
    return "Could not read or write bots.";
  }
}

export interface BotServiceShape {
  readonly list: () => Effect.Effect<ReadonlyArray<Bot>, BotServiceError>;
  readonly get: (botId: BotId) => Effect.Effect<Bot, BotServiceError | BotMutationError>;
  /** Absolute path of a bot's canonical brief, whether or not the file exists yet. */
  readonly briefPath: (botId: BotId) => string;
  /** Absolute path of a bot's memory file, whether or not it exists yet. */
  readonly memoryPath: (botId: BotId) => string;
  /** What the bot has learned, verbatim, or "" when it has written nothing. Never the brief. */
  readonly readMemory: (botId: BotId) => Effect.Effect<string>;
  /** The bot's own write: one note appended under what it knows. Refused past the cap. */
  readonly appendMemoryNote: (
    botId: BotId,
    note: string,
  ) => Effect.Effect<string, BotMemoryError | BotServiceError | BotMutationError>;
  /** Owner-written replacement for a bot's memory; empty clears it. Same cap, same refusal. */
  readonly saveMemory: (
    botId: BotId,
    memory: string,
  ) => Effect.Effect<string, BotMemoryError | BotServiceError | BotMutationError>;
  /** Rewrites `BRIEF.md` on create and edit, so the export cannot drift from the row. */
  readonly mutate: (
    mutation: BotMutation,
  ) => Effect.Effect<Bot, BotServiceError | BotMutationError>;
}

export class BotService extends Context.Service<BotService, BotServiceShape>()(
  "t3/bots/BotService",
) {}

export const layer: Layer.Layer<
  BotService,
  never,
  ServerConfig.ServerConfig | SqlClient.SqlClient | FileSystem.FileSystem | Path.Path
> = Layer.effect(
  BotService,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const baseDir = (yield* ServerConfig.ServerConfig).baseDir;

    const briefPath = (botId: BotId) => path.join(baseDir, briefRelativePath(botId));

    const writeBrief = (bot: Bot) => {
      const target = briefPath(bot.id);
      return fileSystem
        .makeDirectory(path.dirname(target), { recursive: true })
        .pipe(
          Effect.andThen(fileSystem.writeFileString(target, renderBrief(bot))),
          Effect.mapError(botServiceError),
        );
    };

    const memoryFile = makeBotMemoryFile(fileSystem, path, baseDir);
    const memoryPath = memoryFile.pathOf;
    const readMemory = memoryFile.read;

    const tooLarge = (botId: BotId, chars: number) =>
      new BotMemoryError({
        botId,
        failure: "bot_memory_too_large",
        message:
          `That would make ${chars} characters of memory, over the ${BOT_MEMORY_MAX_CHARS} limit. ` +
          "Shorten it, or delete something the bot has learned first.",
      });

    // Both writers meet the same cap and are refused rather than trimmed. The row goes first:
    // memory for a bot no row names would leave a file that no turn can ever read.
    const writeMemory = Effect.fn("BotService.writeMemory")(function* (botId: BotId, text: string) {
      if (!memoryFits(text)) return yield* tooLarge(botId, text.length);
      return yield* memoryFile.write(botId, text);
    });

    const saveMemory = Effect.fn("BotService.saveMemory")(function* (botId: BotId, memory: string) {
      yield* get(botId);
      return yield* writeMemory(botId, memory.trim());
    });

    const appendMemoryNote = Effect.fn("BotService.appendMemoryNote")(function* (
      botId: BotId,
      note: string,
    ) {
      const appended = appendNote(yield* readMemory(botId), note);
      yield* get(botId);
      return yield* writeMemory(botId, appended);
    });

    const list = Effect.fn("BotService.list")(function* () {
      const rows = yield* sql<BotRow>`
        SELECT bot_id, name, role, brief, provider_instance_id, created_at, updated_at
        FROM bots ORDER BY name ASC
      `.pipe(Effect.mapError(botServiceError));
      return rows.map(botFromRow);
    });

    const get = Effect.fn("BotService.get")(function* (botId: BotId) {
      const rows = yield* sql<BotRow>`
        SELECT bot_id, name, role, brief, provider_instance_id, created_at, updated_at
        FROM bots WHERE bot_id = ${botId}
      `.pipe(Effect.mapError(botServiceError));
      const row = rows[0];
      if (row === undefined) {
        return yield* new BotMutationError({ botId, failure: "bot_not_found" });
      }
      return botFromRow(row);
    });

    // Slugs collide, so the first bot with a name keeps the plain slug and later ones take
    // `-2`, `-3`. Ids never change after create, so a rename cannot move a folder.
    const uniqueId = Effect.fnUntraced(function* (name: string) {
      const base = botIdFromName(name);
      if (base === "") {
        return yield* new BotMutationError({
          failure: "bot_id_taken",
          message: `Cannot derive a bot id from '${name}'.`,
        });
      }
      const taken = new Set<string>((yield* list()).map((bot) => bot.id as string));
      if (!taken.has(base)) return base as BotId;
      for (let suffix = 2; ; suffix++) {
        const candidate = `${base.slice(0, 60)}-${suffix}` as BotId;
        if (!taken.has(candidate)) return candidate;
      }
    });

    const create = Effect.fn("BotService.create")(function* (
      input: Extract<BotMutation, { type: "bot.create" }>,
    ) {
      const id = input.id ?? (yield* uniqueId(input.name));
      const now = DateTime.formatIso(yield* DateTime.now);
      const bot: Bot = {
        id,
        name: input.name,
        role: input.role,
        // A bot with an empty brief would be a bot with no instructions; the role is the floor.
        brief: input.brief === undefined || input.brief === "" ? input.role : input.brief,
        providerInstanceId: input.providerInstanceId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      // No pre-check for a taken slug: concurrent creates would race the check, not the key.
      yield* sql`
        INSERT INTO bots (
          bot_id, name, role, brief, provider_instance_id, created_at, updated_at
        ) VALUES (
          ${id}, ${bot.name}, ${bot.role}, ${bot.brief}, ${bot.providerInstanceId}, ${now}, ${now}
        )
      `.pipe(
        Effect.mapError((cause) =>
          isSlugTaken(cause)
            ? new BotMutationError({ botId: id, failure: "bot_id_taken", cause })
            : botServiceError(cause),
        ),
      );
      yield* writeBrief(bot);
      return bot;
    });

    const update = Effect.fn("BotService.update")(function* (
      input: Extract<BotMutation, { type: "bot.update" }>,
    ) {
      const existing = yield* get(input.id);
      const now = DateTime.formatIso(yield* DateTime.now);
      const bot: Bot = {
        ...existing,
        name: input.name ?? existing.name,
        role: input.role ?? existing.role,
        brief: input.brief ?? existing.brief,
        providerInstanceId:
          input.providerInstanceId === undefined
            ? existing.providerInstanceId
            : input.providerInstanceId,
        updatedAt: now,
      };
      yield* sql`
        UPDATE bots
        SET name = ${bot.name}, role = ${bot.role}, brief = ${bot.brief},
            provider_instance_id = ${bot.providerInstanceId}, updated_at = ${now}
        WHERE bot_id = ${input.id}
      `.pipe(Effect.mapError(botServiceError));
      yield* writeBrief(bot);
      return bot;
    });

    // Returns the removed bot: the client already has it for the not-found check, and one
    // success shape keeps the wire contract at `Bot`.
    const remove = Effect.fn("BotService.remove")(function* (botId: BotId) {
      const bot = yield* get(botId);
      yield* sql`DELETE FROM bots WHERE bot_id = ${botId}`.pipe(Effect.mapError(botServiceError));
      // The folder outlives the row on purpose: threads keep their botId, and the brief is the
      // owner's writing. Pruning folders no row names is a separate, deliberate call.
      return bot;
    });

    const mutate = Effect.fn("BotService.mutate")(function* (mutation: BotMutation) {
      switch (mutation.type) {
        case "bot.create":
          return yield* create(mutation);
        case "bot.update":
          return yield* update(mutation);
        case "bot.delete":
          return yield* remove(mutation.id);
      }
    });

    return BotService.of({
      list,
      get,
      mutate,
      briefPath,
      memoryPath,
      readMemory,
      saveMemory,
      appendMemoryNote,
    });
  }),
);
