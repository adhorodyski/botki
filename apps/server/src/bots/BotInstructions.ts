import type { BotId } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as ServerConfig from "../config.ts";
import { MemorySource } from "./MemorySource.ts";
import { instructionsRelativePath } from "./renderBotInstructions.ts";

export class InstructionsStageError extends Schema.TaggedError<InstructionsStageError>()(
  "InstructionsStageError",
  {
    botId: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Could not stage the instructions for bot '${this.botId}'.`;
  }
}

export interface BotInstructionsShape {
  /**
   * Absolute path the provider process should read for this turn, or null when the thread has
   * no bot. A plain thread resolves to null without touching the file system, which is what
   * keeps its prompt byte-identical to a build with no bots at all.
   */
  readonly stageForTurn: (
    botId: BotId | null | undefined,
  ) => Effect.Effect<string | null, InstructionsStageError>;
}

/**
 * Hands the composed block to a provider process that cannot import it. Pi reads the file on
 * every `before_agent_start`, so the session keeps its context while an edited brief lands on
 * the next turn.
 */
export class BotInstructions extends Context.Service<BotInstructions, BotInstructionsShape>()(
  "t3/bots/BotInstructions",
) {}

export const layer: Layer.Layer<
  BotInstructions,
  never,
  ServerConfig.ServerConfig | FileSystem.FileSystem | Path.Path | MemorySource
> = Layer.effect(
  BotInstructions,
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const memory = yield* MemorySource;
    const stateDir = (yield* ServerConfig.ServerConfig).stateDir;

    const stageForTurn = Effect.fn("BotInstructions.stageForTurn")(function* (
      botId: BotId | null | undefined,
    ) {
      // A plain thread stops here, without touching the file system: that is what keeps its
      // prompt byte-identical to a build with no bots at all.
      if (botId === null || botId === undefined) return null;
      const fail = (cause: unknown) => new InstructionsStageError({ botId, cause });
      const instructions = yield* memory.loadForTurn(botId).pipe(Effect.mapError(fail));
      const target = path.join(stateDir, instructionsRelativePath(botId));
      if (instructions === "") {
        // A deleted bot: drop the file so a session that outlives it stops carrying it.
        yield* fileSystem.remove(target, { force: true }).pipe(Effect.ignore);
        return null;
      }
      const staged = yield* fileSystem.readFileString(target).pipe(Effect.orElseSucceed(() => ""));
      if (staged !== instructions) {
        yield* fileSystem
          .makeDirectory(path.dirname(target), { recursive: true })
          .pipe(Effect.mapError(fail));
        yield* fileSystem.writeFileString(target, instructions).pipe(Effect.mapError(fail));
      }
      return target;
    });

    return BotInstructions.of({ stageForTurn });
  }),
);
