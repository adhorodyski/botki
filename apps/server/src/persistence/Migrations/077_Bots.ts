import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

// Bots are data, not files: `<baseDir>/bots/<bot_id>/BRIEF.md` is rendered from this row.
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS bots (
      bot_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      brief TEXT NOT NULL DEFAULT '',
      provider_instance_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) WITHOUT ROWID
  `;
});
