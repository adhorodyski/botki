import { BOT_MEMORY_MAX_CHARS, OrchestratorMcpFailure } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import * as BotService from "../../../bots/BotService.ts";
import { isCapRefusal } from "../../../bots/botMemoryText.ts";
import * as McpToolAccess from "../../McpToolAccess.ts";
import { readCaller } from "../../threadAccess.ts";
import { BotToolkit } from "./tools.ts";

const handlers = {
  bot_remember: McpToolAccess.actsAsCaller((input) =>
    Effect.gen(function* () {
      const { caller } = yield* readCaller();
      const botId = caller?.botId;
      if (botId === undefined || botId === null) {
        return yield* new OrchestratorMcpFailure({
          code: "invalid_request",
          message: "Only a bot's own thread can add to that bot's memory.",
        });
      }
      const bots = yield* BotService.BotService;
      const saved = yield* bots.appendMemoryNote(botId, input.note).pipe(
        // A refusal names the cap and the caller can act on it, so the agent shortens what it
        // knows instead of sending the same note again.
        Effect.catch((cause) =>
          Effect.fail(
            new OrchestratorMcpFailure({
              code: isCapRefusal(cause) ? "invalid_request" : "orchestration_error",
              message: cause.message,
            }),
          ),
        ),
      );
      return {
        memory: saved,
        remainingChars: Math.max(0, BOT_MEMORY_MAX_CHARS - saved.length),
      };
    }),
  ),
} satisfies McpToolAccess.Handlers<typeof BotToolkit.tools>;

export const layer = McpToolAccess.toLayer(BotToolkit, handlers);
