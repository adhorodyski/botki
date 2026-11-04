import {
  BOT_MEMORY_MAX_CHARS,
  OrchestratorMcpFailure,
  TrimmedNonEmptyString,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { Tool, Toolkit } from "effect/ai";

import * as BotService from "../../../bots/BotService.ts";
import * as ThreadManagementService from "../../../orchestration-v2/ThreadManagementService.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";

const dependencies = [
  McpInvocationContext.McpInvocationContext,
  ThreadManagementService.ThreadManagementService,
  BotService.BotService,
];

/**
 * One tool, so the injected tool list pays for one short description. The model never names the
 * bot: the id comes from the calling thread, so a bot cannot write another bot's memory.
 */
const BotRememberTool = Tool.make("bot_remember", {
  description: `In a bot's thread, save one durable note for its later conversations. Notes never outrank the brief and share a ${BOT_MEMORY_MAX_CHARS}-character cap: at the cap, shorten what the bot already knows instead of retrying. The owner reads and edits what you store.`,
  parameters: Schema.Struct({
    note: TrimmedNonEmptyString.annotate({
      description: "One thing worth remembering, briefly.",
    }),
  }),
  success: Schema.Struct({
    memory: Schema.String.annotate({
      description: "What the bot knows now, including this note.",
    }),
    remainingChars: Schema.Int.annotate({ description: "Characters left before the cap." }),
  }),
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
  .annotate(Tool.Title, "Remember")
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, false)
  .annotate(Tool.OpenWorld, false);

export const BotToolkit = Toolkit.make(BotRememberTool);
