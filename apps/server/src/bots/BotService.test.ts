import { BotId, BotMutationError, ProviderInstanceId } from "@t3tools/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";

import * as ServerConfig from "../config.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as BotService from "./BotService.ts";
import { renderBrief } from "./renderBotInstructions.ts";

// The service raises two errors; only the mutation one carries a reason, and a test that got
// the other one should read as a wrong failure, not a type puzzle.
const failureOf = (cause: BotMutationError | BotService.BotServiceError) =>
  cause._tag === "BotMutationError" ? cause.failure : cause._tag;

const createViki = {
  type: "bot.create" as const,
  name: "Viki",
  role: "proofreader",
  brief: "You fix grammar. Reply ONLY with the corrected text. Never explain.",
};

// layerMemory runs the migrations, so the table under test is the one the server gets. The
// config layer builds itself from a temp dir, so the platform services come in last.
const layerTest = BotService.layer.pipe(
  Layer.provide(SqlitePersistence.layerMemory),
  Layer.provide(
    ServerConfig.layerTest(process.cwd(), { prefix: "t3-bots-test-" }).pipe(
      Layer.provide(NodeServices.layer),
    ),
  ),
  Layer.provide(NodeServices.layer),
);

it.layer(Layer.mergeAll(NodeServices.layer, layerTest))("BotService", (it) => {
  it.effect("round-trips a bot through create, list, update, and delete", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const created = yield* bots.mutate(createViki);
      assert.equal(created.id, BotId.make("viki"));
      assert.deepEqual(yield* bots.list(), [created]);

      const renamed = yield* bots.mutate({ type: "bot.update", id: created.id, name: "Viki Sr." });
      assert.equal(renamed.id, created.id);
      assert.equal(renamed.brief, createViki.brief);

      const removed = yield* bots.mutate({ type: "bot.delete", id: created.id });
      assert.deepEqual(yield* bots.list(), []);
      assert.equal(removed.id, created.id);
    }),
  );

  it.effect("writes the brief where the folder layout says, and rewrites it on edit", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* bots.mutate(createViki);
      const target = bots.briefPath(created.id);

      assert.equal(yield* fileSystem.readFileString(target), renderBrief(created));

      yield* bots.mutate({ type: "bot.update", id: created.id, brief: "Reply in one clause." });
      assert.equal(yield* fileSystem.readFileString(target), "Reply in one clause.\n");

      // A rename must not move the folder: the id, not the name, owns the path.
      yield* bots.mutate({ type: "bot.update", id: created.id, name: "Proofreader" });
      assert.equal(yield* fileSystem.readFileString(target), "Reply in one clause.\n");

      yield* bots.mutate({ type: "bot.delete", id: created.id });
      // v0 conservatism: the row goes, the owner's file stays.
      assert.equal(yield* fileSystem.readFileString(target), "Reply in one clause.\n");
    }),
  );

  it.effect("disambiguates a repeated name and keeps ids stable across a rename", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const first = yield* bots.mutate(createViki);
      const second = yield* bots.mutate(createViki);
      assert.equal(first.id, BotId.make("viki"));
      assert.equal(second.id, BotId.make("viki-2"));

      // Freed slugs stay taken: ids are never reused, so a thread's botId cannot silently
      // repoint at a different bot.
      const third = yield* bots.mutate(createViki);
      assert.equal(third.id, BotId.make("viki-3"));
    }),
  );

  it.effect("rejects a create with an id another bot holds", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      yield* bots.mutate(createViki);
      const failure = yield* Effect.flip(bots.mutate({ ...createViki, id: BotId.make("viki") }));
      assert.strictEqual(failureOf(failure), "bot_id_taken");
    }),
  );

  it.effect("fails an update or delete on an unknown id", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      for (const mutation of [
        { type: "bot.update" as const, id: BotId.make("nobody"), name: "Ghost" },
        { type: "bot.delete" as const, id: BotId.make("nobody") },
      ]) {
        assert.strictEqual(failureOf(yield* Effect.flip(bots.mutate(mutation))), "bot_not_found");
      }
    }),
  );

  it.effect("falls back to the role when the brief is left blank", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const created = yield* bots.mutate({
        type: "bot.create",
        name: "Sentry",
        role: "wakes me when the build breaks",
        brief: "",
      });
      assert.equal(created.brief, "wakes me when the build breaks");
    }),
  );

  it.effect("keeps the provider instance null until one is picked", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const created = yield* bots.mutate(createViki);
      assert.strictEqual(created.providerInstanceId, null);
      const picked = yield* bots.mutate({
        type: "bot.update",
        id: created.id,
        providerInstanceId: ProviderInstanceId.make("pi"),
      });
      assert.strictEqual(picked.providerInstanceId, ProviderInstanceId.make("pi"));
      const cleared = yield* bots.mutate({
        type: "bot.update",
        id: created.id,
        providerInstanceId: null,
      });
      assert.strictEqual(cleared.providerInstanceId, null);
    }),
  );
});
