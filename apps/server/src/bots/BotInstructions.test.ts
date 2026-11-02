import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as ServerConfig from "../config.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as BotInstructions from "./BotInstructions.ts";
import * as BotService from "./BotService.ts";
import * as BriefMemorySource from "./BriefMemorySource.ts";
import { instructionsRelativePath, renderBotInstructions } from "./renderBotInstructions.ts";

// Real database and real files on disk: this is the seam a provider process reads from, so a
// noop FileSystem or a stubbed row would prove nothing.
// Each service asks for the same SqlClient and config layers, so they build once and the row,
// the brief, and the staged block come from one database — which is what the test is for.
const layerTest = BotInstructions.layer.pipe(
  Layer.provideMerge(BriefMemorySource.layer),
  Layer.provideMerge(BotService.layer),
  Layer.provide(SqlitePersistence.layerMemory),
  // provideMerge: two of these tests read the config to name the path they expect.
  Layer.provideMerge(
    ServerConfig.layerTest(process.cwd(), { prefix: "t3-bot-instructions-test-" }),
  ),
  Layer.provide(NodeServices.layer),
);

const createViki = {
  type: "bot.create" as const,
  name: "Viki",
  role: "proofreader",
  brief: "You fix grammar. Reply ONLY with the corrected text. Never explain.",
};

it.layer(Layer.mergeAll(NodeServices.layer, layerTest))("BotInstructions", (it) => {
  it.effect("gives a thread with no bot nothing to read, and writes nothing", () =>
    Effect.gen(function* () {
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const stageDir = path.join((yield* ServerConfig.ServerConfig).stateDir, "bot-instructions");
      for (const botId of [null, undefined]) {
        assert.strictEqual(yield* instructions.stageForTurn(botId), null);
      }
      // The byte-identical-prompt guarantee rests on this: no bot, so no staging directory
      // exists at all, let alone a file the adapter might pick up.
      assert.isFalse(yield* fileSystem.exists(stageDir));
    }),
  );

  it.effect("stages the exact block a bot turn carries", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const stateDir = (yield* ServerConfig.ServerConfig).stateDir;
      const created = yield* bots.mutate(createViki);

      const staged = yield* instructions.stageForTurn(created.id);
      assert.strictEqual(staged, path.join(stateDir, instructionsRelativePath(created.id)));
      assert.equal(
        yield* fileSystem.readFileString(staged!),
        renderBotInstructions({
          id: created.id,
          name: created.name,
          role: created.role,
          brief: created.brief,
        }),
      );
    }),
  );

  it.effect("lands an edited brief on the next turn of a live session", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);

      const staged = yield* instructions.stageForTurn(created.id);
      yield* bots.mutate({ type: "bot.update", id: created.id, brief: "Reply in one clause." });
      // Same path, so the session keeps its context; new bytes, so the edit is not lost.
      assert.strictEqual(yield* instructions.stageForTurn(created.id), staged);
      assert.include(yield* fileSystem.readFileString(staged!), "Reply in one clause.");
    }),
  );

  it.effect("drops the block for a deleted bot so its threads go plain", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const instructions = yield* BotInstructions.BotInstructions;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);
      const staged = yield* instructions.stageForTurn(created.id);
      assert.isString(staged);

      yield* bots.mutate({ type: "bot.delete", id: created.id });
      assert.strictEqual(yield* instructions.stageForTurn(created.id), null);
      assert.isFalse(yield* fileSystem.exists(staged!));
    }),
  );
});
