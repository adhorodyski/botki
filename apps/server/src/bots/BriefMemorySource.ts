import type { BotId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as SqlClient from "effect/sql/SqlClient";

import * as ServerConfig from "../config.ts";
import { makeBotMemoryFile } from "./botMemoryText.ts";
import { renderBotInstructions } from "./renderBotInstructions.ts";
import { MemoryLoadError, MemorySource } from "./MemorySource.ts";

interface BotRow {
  readonly name: string;
  readonly role: string;
  readonly brief: string;
}

/**
 * The brief comes from the row, since `BRIEF.md` is only its export, and the bot's notes come
 * from `MEMORY.md`, which is the source. Both are read per turn, so an edit from either side
 * lands on the next turn without a session restart.
 */
export const layer: Layer.Layer<
  MemorySource,
  never,
  SqlClient.SqlClient | ServerConfig.ServerConfig | FileSystem.FileSystem | Path.Path
> = Layer.effect(
  MemorySource,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const memory = makeBotMemoryFile(fileSystem, path, (yield* ServerConfig.ServerConfig).baseDir);
    return MemorySource.of({
      loadForTurn: Effect.fn("BriefMemorySource.loadForTurn")(function* (botId: BotId) {
        const rows = yield* sql<BotRow>`
          SELECT name, role, brief FROM bots WHERE bot_id = ${botId}
        `.pipe(Effect.mapError((cause) => new MemoryLoadError({ botId, cause })));
        const row = rows[0];
        return row === undefined
          ? ""
          : renderBotInstructions(
              { id: botId, name: row.name, role: row.role, brief: row.brief },
              yield* memory.read(botId),
            );
      }),
    });
  }),
);
