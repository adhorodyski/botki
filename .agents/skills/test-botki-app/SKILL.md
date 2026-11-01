---
name: test-botki-app
description: Test Botki's web and desktop UI through its built-in Browser panel against isolated development state, and save the captures an ACCEPT needs. Use for browser verification, browser pairing recovery, test fixtures, and Replay runs on the Pi path.
---

# Test Botki web and desktop

Use Botki's built-in Browser panel for verification. If its tools are absent or
the panel reports unavailable, explain the blocker and stop verification.
Do not install or switch to another automation system.

## Start the app

Reuse this task's healthy dev server. Otherwise run `vp run dev` from the
repository root and retain its terminal session. Use the worktree's ignored
`.t3` state and read the actual ports and pairing URL from the dev-runner output.
Never run against `~/.t3/userdata` or set `VITE_HTTP_URL` or `VITE_WS_URL`.

Test with meaningful project and thread data. Read
[references/sqlite-fixtures.md](references/sqlite-fixtures.md) only when
inspecting or seeding SQLite. Stop the test server before direct fixture writes.

## Drive agent turns for free

Do not spend a paid model to see a turn render. `vp run dev` registers the
`Replay (dev)` provider, which replays recorded turns with simulated streaming
through the real adapter and orchestration. Its models are scenarios.
`showcase` covers thinking, a plan, tool calls, an approval, and markdown.
Press `Ctrl+Alt+Shift+R` for a picker (GNOME takes that key for screen
recording), call `window.t3dev.replay("showcase")` with `preview_evaluate`, or
run
`node apps/server/src/bin.ts thread start --base-dir .t3 --provider devReplay --model showcase <project> "go"`.
That provider speaks ACP, so its models are the `registry_transcript.ndjson`
fixtures: `showcase`, `todo-list`, `approval`, `question`, `multi-turn`. A Pi
fixture such as `pi_chat_demo` is not in the picker and asking for it throws
`Unknown replay scenario`.

Pi is the reference provider. Its chat demo is the `pi_chat_demo` fixture: two
turns where the second repeats a marker only the first established, which is
what an ACCEPT uses to prove history survives. Verify it headless with
`vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`
rather than through the panel. Use a live Pi turn only when the change depends
on real provider behavior, and then Pi's cheapest model (Haiku 4.5 is a couple
of cents for two turns); enable Pi under Settings then Providers if the picker
does not list it. To re-record
the Pi transcript after a Pi upgrade, run
`vp run record:pi-replay --scenario pi_chat_demo` from `apps/server` with
`--out` pointed at a scratch file, diff it against the committed fixture, then
run `PiReplayFixtures.integration.test.ts`.

## Use the Browser panel

Call `preview_status`, then `preview_open` if the Browser panel is
closed. Navigate to the complete startup pairing URL once with
`preview_navigate`, then use `preview_snapshot` and Botki's interaction tools.
If the token was consumed or expired, run `node apps/server/src/bin.ts pair`
for a fresh one. Keep using the same tab.

## Save captures for the ACCEPT

Reference captures for a slice live in `ACCEPT/captures/<issue>/`, named for
what they prove, such as `pi-chat-demo-history.png`. Snapshot with `save: true`
and copy the returned path there, or upload straight to GitHub when the ACCEPT
is already a PR. Keep secrets, pairing tokens, and machine paths out of every
capture.

## Verify and retain

Exercise the affected flow and capture the state that proves it works. Keep
the server, state, and panel available while the user inspects or iterates.
An assistant turn ending is not teardown. Stop only processes you started,
using retained terminal sessions or captured PIDs.

When sharing is requested, start with `vp run dev --share` and give the user
a fresh complete pairing URL that you have not consumed. Keep other credentials
out of screenshots, commits, and replies.
