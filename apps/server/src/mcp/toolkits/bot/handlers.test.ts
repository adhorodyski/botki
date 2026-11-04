import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import { BOT_MEMORY_MAX_CHARS, BotId, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import { McpSchema, McpServer } from "effect/ai";

import * as ServerConfig from "../../../config.ts";
import * as BotService from "../../../bots/BotService.ts";
import * as SqlitePersistence from "../../../persistence/Sqlite.ts";
import * as ThreadManagement from "../../../orchestration-v2/ThreadManagementService.ts";
import * as McpHttpServer from "../../McpHttpServer.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import { liveThreadShell } from "../../McpToolAccess.testkit.ts";

// What the tool layer adds over the service: the bot id is read from the calling thread, so one
// bot cannot aim a note at another bot's file, and a plain thread has nothing to write to.
const threadId = ThreadId.make("thread:viki");
// The mocked shell always names the same bot, and one in-memory database serves the whole file,
// so each test starts from an empty team holding just that bot.
const freshViki = Effect.fn("test.freshViki")(function* (bots: BotService.BotService["Service"]) {
  // Deleting a bot keeps its folder, so a cleared bot goes first: a full file left by an earlier
  // test would make this one's write refuse for a reason it did not create.
  yield* bots.saveMemory(BotId.make("viki"), "").pipe(Effect.ignore);
  for (const bot of yield* bots.list()) {
    yield* bots.saveMemory(bot.id, "").pipe(Effect.ignore);
    yield* bots.mutate({ type: "bot.delete", id: bot.id });
  }
  return yield* bots.mutate({
    type: "bot.create",
    id: BotId.make("viki"),
    name: "Viki",
    role: "proofreader",
    brief: "You fix grammar.",
  });
});

const scope = McpInvocationContext.McpInvocationContext.of({
  environmentId: "env:test" as never,
  issuedAt: 0,
  requestNamespace: "test",
  capabilities: new Set(["orchestration"]),
  thread: {
    threadId,
    providerSessionId: "session-bot-test",
    providerInstanceId: ProviderInstanceId.make("codex"),
  },
  client: undefined,
});

const client = McpSchema.McpServerClient.of({
  clientId: 1,
  protocolVersion: "2025-06-18",
  clientCapabilities: {},
  clientInfo: { name: "bot-tool-test", version: "1" },
  initializePayload: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "bot-tool-test", version: "1" },
  },
  getClient: Effect.die("unused"),
});

// One BotService for both the handler and the assertions, by layer identity memoization.
const layerServices = BotService.layer.pipe(
  Layer.provide(SqlitePersistence.layerMemory),
  Layer.provideMerge(ServerConfig.layerTest(process.cwd(), { prefix: "t3-bot-mcp-test-" })),
  Layer.provide(NodeServices.layer),
);

const layerTool = (botId: BotId | undefined) =>
  Layer.mergeAll(
    McpHttpServer.layerBotToolkit.pipe(
      Layer.provide(layerServices),
      Layer.provide(
        Layer.mock(ThreadManagement.ThreadManagementService)({
          getThreadShell: (id) =>
            Effect.succeed(
              botId === undefined ? liveThreadShell(id) : { ...liveThreadShell(id), botId },
            ),
        }),
      ),
    ),
    McpServer.McpServer.layer,
    layerServices,
    NodeServices.layer,
  );

const remember = (args: Record<string, unknown>) =>
  Effect.gen(function* () {
    const server = yield* McpServer.McpServer;
    return yield* server
      .callTool({ name: "bot_remember", arguments: args })
      .pipe(
        Effect.provideService(McpInvocationContext.McpInvocationContext, scope),
        Effect.provideService(McpSchema.McpServerClient, client),
      );
  });

const failureText = (result: McpSchema.CallToolResult) => {
  const first = result.content[0];
  return result.isError === true && first?.type === "text" ? first.text : "";
};

it.layer(layerTool(BotId.make("viki")))("bot_remember", (it) => {
  it.effect("stores the note in the bot's own memory", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const fileSystem = yield* FileSystem.FileSystem;
      const created = yield* freshViki(bots);

      expect((yield* remember({ note: "Adam hates the serial comma." })).isError).toBe(false);
      expect(yield* bots.readMemory(created.id)).toContain("Adam hates the serial comma.");
      expect(yield* fileSystem.exists(bots.memoryPath(created.id))).toBe(true);
    }),
  );

  it.effect("refuses a note past the cap rather than shortening what the bot knows", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const created = yield* freshViki(bots);
      yield* bots.saveMemory(created.id, "n".repeat(BOT_MEMORY_MAX_CHARS));

      const result = yield* remember({ note: "one word too many" });
      expect(result.isError).toBe(true);
      expect(failureText(result)).toContain(`${BOT_MEMORY_MAX_CHARS}`);
      expect(yield* bots.readMemory(created.id)).toBe("n".repeat(BOT_MEMORY_MAX_CHARS));
    }),
  );

  it.effect("writes only its own bot's memory, whatever the model asks for", () =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const viki = yield* freshViki(bots);
      const other = yield* bots.mutate({
        type: "bot.create",
        name: "Theirs",
        role: "proofreader",
        brief: "You fix grammar.",
      });

      // The parameters name no bot id, so a smuggled one is dropped at decode and cannot point
      // the note at another bot: the calling thread's own bot is the only target there is.
      const smuggled = yield* remember({ note: "belongs to me", botId: other.id });
      expect(smuggled.isError, failureText(smuggled)).toBe(false);
      expect(yield* bots.readMemory(viki.id)).toContain("belongs to me");
      expect(yield* bots.readMemory(other.id)).toBe("");
    }),
  );
});

it.layer(layerTool(undefined))("bot_remember on a plain thread", (it) => {
  it.effect("refuses, since there is no bot to remember it", () =>
    Effect.gen(function* () {
      expect(failureText(yield* remember({ note: "nothing owns this note" }))).toContain("bot");
    }),
  );
});
