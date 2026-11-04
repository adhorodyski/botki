import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

// A task names a bot rather than storing a copy of it, so renaming or editing the brief needs
// no touch here, and no row changes: NULL means the task runs as a plain assistant, as before.
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`ALTER TABLE scheduled_tasks ADD COLUMN bot_id TEXT`;
});
