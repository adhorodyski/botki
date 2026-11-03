import type { BotId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";

import { renderBotInstructions } from "./renderBotInstructions.ts";
import { MemoryLoadError, MemorySource } from "./MemorySource.ts";

interface BotRow {
  readonly name: string;
  readonly role: string;
  readonly brief: string;
}

/**
 * Today's only `MemorySource`. The row is authoritative and `BRIEF.md` is its export, written by
 * `BotService` on every create and edit — so this reads the row and never the file, and an edit
 * lands on the next turn without a session restart.
 */
export const layer: Layer.Layer<MemorySource, never, SqlClient.SqlClient> = Layer.effect(
  MemorySource,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    return MemorySource.of({
      loadForTurn: Effect.fn("BriefMemorySource.loadForTurn")(function* (botId: BotId) {
        const rows = yield* sql<BotRow>`
          SELECT name, role, brief FROM bots WHERE bot_id = ${botId}
        `.pipe(Effect.mapError((cause) => new MemoryLoadError({ botId, cause })));
        const row = rows[0];
        return row === undefined ? "" : renderBotInstructions({ id: botId, ...row });
      }),
    });
  }),
);
