import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import {
  BOT_MEMORY_MAX_CHARS,
  Bot,
  BotId,
  BotMemorySaveInput,
  BotMutation,
  botIdFromName,
} from "./bot.ts";

const decodeBot = Schema.decodeUnknownEffect(Bot);
const decodeMutation = Schema.decodeUnknownEffect(BotMutation);
const decodeMemorySave = Schema.decodeUnknownEffect(BotMemorySaveInput);

const botFields = {
  id: "viki",
  name: "Viki",
  role: "proofreader",
  brief: "You fix grammar.",
  providerInstanceId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

it.effect("accepts a bot without a provider instance and one with one", () =>
  Effect.gen(function* () {
    const bot = yield* decodeBot(botFields);
    assert.strictEqual(bot.id, BotId.make("viki"));
    assert.strictEqual(bot.providerInstanceId, null);
    assert.strictEqual(
      (yield* decodeBot({ ...botFields, providerInstanceId: "pi" })).providerInstanceId,
      "pi",
    );
  }),
);

it.effect("rejects ids that would not be safe as folder names", () =>
  Effect.gen(function* () {
    for (const id of ["Viki", "two words", "-leading", "trailing-", "a/b", "", "../escape"]) {
      const exit = yield* Effect.exit(decodeBot({ ...botFields, id }));
      assert.isTrue(Exit.isFailure(exit), `expected '${id}' to be rejected`);
    }
  }),
);

it.effect("keeps every mutation shape discriminated by type", () =>
  Effect.gen(function* () {
    assert.deepStrictEqual(
      yield* decodeMutation({ type: "bot.create", name: "Viki", role: "proofreader" }),
      {
        type: "bot.create",
        name: "Viki",
        role: "proofreader",
      },
    );
    assert.deepStrictEqual(
      yield* decodeMutation({ type: "bot.update", id: BotId.make("viki"), role: "editor" }),
      {
        type: "bot.update",
        id: BotId.make("viki"),
        role: "editor",
      },
    );
    assert.deepStrictEqual(yield* decodeMutation({ type: "bot.delete", id: BotId.make("viki") }), {
      type: "bot.delete",
      id: BotId.make("viki"),
    });
    assert.isTrue(
      Exit.isFailure(yield* Effect.exit(decodeMutation({ type: "bot.delete", id: "Not A Slug" }))),
    );
  }),
);

// The cap is enforced here as well as in the service, because the owner's edit path is the RPC
// schema and the bot's is the MCP tool: whichever the writer, the wire refuses the same size.
it.effect("caps memory at the shared bound and allows an empty save to clear it", () =>
  Effect.gen(function* () {
    const fields = { id: BotId.make("viki") };
    assert.deepStrictEqual(yield* decodeMemorySave({ ...fields, memory: "" }), {
      ...fields,
      memory: "",
    });
    assert.deepStrictEqual(
      yield* decodeMemorySave({ ...fields, memory: "x".repeat(BOT_MEMORY_MAX_CHARS) }),
      { ...fields, memory: "x".repeat(BOT_MEMORY_MAX_CHARS) },
    );
    const tooLong = yield* Effect.exit(
      decodeMemorySave({ ...fields, memory: "x".repeat(BOT_MEMORY_MAX_CHARS + 1) }),
    );
    assert.isTrue(Exit.isFailure(tooLong));
  }),
);

it("derives folder-safe ids from names", () => {
  assert.strictEqual(botIdFromName("Viki"), "viki");
  assert.strictEqual(botIdFromName("  Review Bot  "), "review-bot");
  assert.strictEqual(botIdFromName("Émile — QA"), "emile-qa");
  assert.strictEqual(botIdFromName("a".repeat(80)).length, 64);
  assert.strictEqual(botIdFromName("!!!"), "");
});
