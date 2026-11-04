import * as Schema from "effect/Schema";

import { IsoDateTime, TrimmedNonEmptyString, TrimmedString } from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";

const BOT_ID_MAX_CHARS = 64;
const BOT_NAME_MAX_CHARS = 120;
const BOT_ROLE_MAX_CHARS = 240;
const BOT_BRIEF_MAX_CHARS = 32_000;

// Memory rides into every turn beside the brief, so its bound is a context-budget decision,
// not a storage one. Refuse at the cap rather than trimming: silent loss is what this guards.
export const BOT_MEMORY_MAX_CHARS = 4_000;

const BotMemoryText = Schema.String.check(Schema.isMaxLength(BOT_MEMORY_MAX_CHARS));

// Folder-safe so `<homeDir>/bots/<id>/` never needs escaping; reused for the id itself.
const BotSlug = TrimmedNonEmptyString.check(
  Schema.isMaxLength(BOT_ID_MAX_CHARS),
  Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
);

export const BotId = BotSlug.pipe(Schema.brand("BotId"));
export type BotId = typeof BotId.Type;

const BotName = TrimmedNonEmptyString.check(Schema.isMaxLength(BOT_NAME_MAX_CHARS));

const BotRole = TrimmedNonEmptyString.check(Schema.isMaxLength(BOT_ROLE_MAX_CHARS));

const BotBrief = TrimmedString.check(Schema.isMaxLength(BOT_BRIEF_MAX_CHARS));

export const Bot = Schema.Struct({
  id: BotId,
  name: BotName,
  role: BotRole,
  brief: BotBrief,
  /** Null until picked; a turn then uses the environment's default provider instance. */
  providerInstanceId: Schema.NullOr(ProviderInstanceId),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Bot = typeof Bot.Type;

export const BotMemoryReadInput = Schema.Struct({
  id: BotId,
});
export type BotMemoryReadInput = typeof BotMemoryReadInput.Type;

export const BotMemorySaveInput = Schema.Struct({
  id: BotId,
  /** Empty clears the bot's memory. */
  memory: BotMemoryText,
});
export type BotMemorySaveInput = typeof BotMemorySaveInput.Type;

export const BotMemoryResult = Schema.Struct({
  memory: Schema.String,
  maxChars: Schema.Number.check(Schema.isGreaterThan(0)),
});
export type BotMemoryResult = typeof BotMemoryResult.Type;

const BotMemoryFailure = Schema.Literals([
  "bot_not_found",
  "bot_memory_too_large",
  "bot_memory_unwritable",
]);
export type BotMemoryFailure = typeof BotMemoryFailure.Type;

export class BotMemoryError extends Schema.TaggedError<BotMemoryError>()("BotMemoryError", {
  botId: Schema.optional(BotId),
  failure: BotMemoryFailure,
  message: TrimmedNonEmptyString,
  cause: Schema.optional(Schema.Defect()),
}) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: {
    readonly botId?: string;
    readonly failure: BotMemoryFailure;
    readonly message?: string;
    readonly cause?: unknown;
  }) {
    super({
      ...props,
      message:
        props.message ??
        (props.failure === "bot_not_found"
          ? `Bot '${props.botId ?? ""}' was not found.`
          : props.failure === "bot_memory_unwritable"
            ? "Could not write the bot's memory."
            : `Memory is limited to ${BOT_MEMORY_MAX_CHARS} characters. Remove something the bot has learned before adding more.`),
    } as any);
  }
}

export const BotSnapshot = Schema.Struct({
  bots: Schema.Array(Bot),
  updatedAt: IsoDateTime,
});
export type BotSnapshot = typeof BotSnapshot.Type;

export const BotCreateInput = Schema.Struct({
  /** Omit to derive the id from the name; a taken slug fails with `bot_id_taken`. */
  id: Schema.optional(BotId),
  name: BotName,
  role: BotRole,
  brief: Schema.optional(BotBrief),
  providerInstanceId: Schema.optional(Schema.NullOr(ProviderInstanceId)),
});
export type BotCreateInput = typeof BotCreateInput.Type;

export const BotUpdateInput = Schema.Struct({
  id: BotId,
  name: Schema.optional(BotName),
  role: Schema.optional(BotRole),
  brief: Schema.optional(BotBrief),
  providerInstanceId: Schema.optional(Schema.NullOr(ProviderInstanceId)),
});
export type BotUpdateInput = typeof BotUpdateInput.Type;

const BotDeleteInput = Schema.Struct({
  id: BotId,
});

export const BotMutation = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("bot.create"),
    ...BotCreateInput.fields,
  }),
  Schema.Struct({
    type: Schema.Literal("bot.update"),
    ...BotUpdateInput.fields,
  }),
  Schema.Struct({
    type: Schema.Literal("bot.delete"),
    ...BotDeleteInput.fields,
  }),
]);
export type BotMutation = typeof BotMutation.Type;

const BotMutationFailure = Schema.Literals(["bot_id_taken", "bot_not_found"]);
export type BotMutationFailure = typeof BotMutationFailure.Type;

export class BotMutationError extends Schema.TaggedError<BotMutationError>()("BotMutationError", {
  botId: Schema.optional(BotId),
  failure: BotMutationFailure,
  message: TrimmedNonEmptyString,
  cause: Schema.optional(Schema.Defect()),
}) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: {
    readonly botId?: string;
    readonly failure: BotMutationFailure;
    readonly message?: string;
    readonly cause?: unknown;
  }) {
    super({
      ...props,
      message:
        props.message ??
        (props.failure === "bot_id_taken"
          ? `A bot named '${props.botId ?? ""}' already exists.`
          : `Bot '${props.botId ?? ""}' was not found.`),
    } as any);
  }
}

export function botIdFromName(name: string): string {
  // Accents fold rather than split: NFD leaves combining marks that would read as separators.
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BOT_ID_MAX_CHARS)
    .replace(/-+$/g, "");
}
