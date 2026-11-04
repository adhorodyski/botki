import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { BOT_MEMORY_MAX_CHARS, BotId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";

import * as ServerConfig from "../config.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as BotInstructions from "./BotInstructions.ts";
import * as BotService from "./BotService.ts";
import * as BriefMemorySource from "./BriefMemorySource.ts";

// Real database, real files: memory is only worth testing at the seam a provider process reads,
// where the row, the file, and the staged block have to agree.
const layerTest = BotInstructions.layer.pipe(
  Layer.provideMerge(BriefMemorySource.layer),
  Layer.provideMerge(BotService.layer),
  Layer.provide(SqlitePersistence.layerMemory),
  Layer.provideMerge(ServerConfig.layerTest(process.cwd(), { prefix: "t3-bot-memory-test-" })),
  Layer.provide(NodeServices.layer),
);

const createViki = {
  type: "bot.create" as const,
  name: "Viki",
  role: "proofreader",
  brief: "You fix grammar. Reply ONLY with the corrected text. Never explain.",
};

const BRIEF_LINE = "You fix grammar. Reply ONLY with the corrected text. Never explain.";

it.layer(Layer.mergeAll(NodeServices.layer, layerTest))("BotMemory", (it) => {
  it.effect("keeps a bot with no notes byte-identical to a build with no memory at all", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);

      const staged = yield* instructions.stageForTurn(created.id);
      const text = yield* fileSystem.readFileString(staged!);
      // The null path the issue asks for: no memory block, no stray blank line, same brief.
      assert.notInclude(text, "botki_bot_memory");
      assert.notInclude(text, "MEMORY.md");
      assert.isTrue(text.includes(BRIEF_LINE));
      assert.isFalse(
        text.includes("\n\n\n"),
        "an empty memory section would leave a gap in the block",
      );
    }),
  );

  it.effect("lands a written note in the staged block on the next turn", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);

      const first = yield* instructions.stageForTurn(created.id);
      assert.notInclude(yield* fileSystem.readFileString(first!), "serial comma");

      yield* bots.appendMemoryNote(created.id, "Adam hates the serial comma.");

      // Same path, so the provider session keeps its context; new bytes, so the note is there.
      const second = yield* instructions.stageForTurn(created.id);
      assert.strictEqual(second, first);
      assert.include(yield* fileSystem.readFileString(second!), "Adam hates the serial comma.");
    }),
  );

  it.effect("keeps the brief ahead of memory in the composed block", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);
      yield* bots.appendMemoryNote(created.id, "Adam hates the serial comma.");

      const text = yield* fileSystem.readFileString(
        (yield* instructions.stageForTurn(created.id))!,
      );
      assert.isBelow(text.indexOf(BRIEF_LINE), text.indexOf("serial comma"));
    }),
  );

  it.effect("refuses a note that would pass the cap, leaving the brief intact", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);
      yield* bots.saveMemory(created.id, "n".repeat(BOT_MEMORY_MAX_CHARS));

      const failure = yield* Effect.flip(bots.appendMemoryNote(created.id, "one word too many"));
      assert.strictEqual(failure._tag, "BotMemoryError");
      if (failure._tag === "BotMemoryError")
        assert.strictEqual(failure.failure, "bot_memory_too_large");

      // The refused write left nothing behind: the full memory and the whole brief still stand.
      const text = yield* fileSystem.readFileString(
        (yield* instructions.stageForTurn(created.id))!,
      );
      assert.include(text, BRIEF_LINE);
      assert.include(text, "n".repeat(BOT_MEMORY_MAX_CHARS));
      assert.notInclude(text, "one word too many");
    }),
  );

  it.effect("keeps an owner's edit through a later bot write", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);

      yield* bots.saveMemory(created.id, "Adam prefers British spelling.");
      yield* bots.appendMemoryNote(created.id, "Adam ships on Fridays.");

      const staged = yield* instructions.stageForTurn(created.id);
      // The file lives where the spec says, beside the brief.
      assert.include(
        yield* fileSystem.readFileString(bots.memoryPath(created.id)),
        "Adam prefers British spelling.",
      );
      const text = yield* fileSystem.readFileString(staged!);
      assert.include(text, "Adam prefers British spelling.");
      assert.include(text, "Adam ships on Fridays.");
    }),
  );

  it.effect("clearing memory leaves the block as a plain brief", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);
      yield* bots.appendMemoryNote(created.id, "Adam hates the serial comma.");

      yield* bots.saveMemory(created.id, "");

      assert.isFalse(yield* fileSystem.exists(bots.memoryPath(created.id)));
      assert.notInclude(
        yield* fileSystem.readFileString((yield* instructions.stageForTurn(created.id))!),
        "botki_bot_memory",
      );
    }),
  );

  it.effect("refuses memory for a bot no row names", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const failure = yield* Effect.flip(
        bots.appendMemoryNote(BotId.make("nobody"), "a note for a bot that is not here"),
      );
      assert.strictEqual(failure._tag, "BotMutationError");
    }),
  );
});
