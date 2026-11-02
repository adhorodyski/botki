import type { BotId } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export class MemoryLoadError extends Schema.TaggedError<MemoryLoadError>()("MemoryLoadError", {
  botId: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {
  override get message(): string {
    return `Could not load the instructions for bot '${this.botId}'.`;
  }
}

export interface MemorySourceShape {
  /**
   * The instructions block this bot's next turn carries. Empty for a bot with no row, so a
   * deleted bot leaves its threads running as plain threads instead of failing them.
   */
  readonly loadForTurn: (botId: BotId) => Effect.Effect<string, MemoryLoadError>;
}

/**
 * The one place a turn's instructions get composed. `BriefMemorySource` is today's only
 * implementation; TS5 adds recall and remember behind this seam, and nothing else builds the
 * block, so that grows here alone.
 */
export class MemorySource extends Context.Service<MemorySource, MemorySourceShape>()(
  "t3/bots/MemorySource",
) {}
