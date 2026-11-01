# ACCEPT/<issue-number>-<slug>

How to close this slice. One PR = exactly one ACCEPT file, named after the issue it
closes: `ACCEPT/2-night-agent-contract.md`. If this slice genuinely does not need one,
say so in one line in the PR body instead.

The owner's job is to read this, run the checklist, and decide. Five minutes, not a
review. Anything that needs more than the commands below belongs in the code, not here.

Write this file before you start building, from the issue's acceptance checklist. Fill
it in as you go; do not backfill it from the diff.

## Naming and layout

- File: `ACCEPT/<issue-number>-<slug>.md`, one per PR.
- Reference captures: `ACCEPT/captures/<issue>/`, named for what they prove
  (`pi-chat-demo-history.png`, not `screenshot-1.png`). Upload evidence to GitHub;
  never commit PR-only assets.
- Commits: `night(<slice>): ...`. One PR per task. Never force-push.

## Acceptance checklist

One line per item, copied from the issue, each with the command or capture that settles it.

- [ ] <requirement> — `<command>` or `ACCEPT/captures/<issue>/<capture>.png`

The last item is always: `vp run check:changed` green, and the run-report in the PR body.

## Replay scenario

Every slice that touches a rendered surface names how the owner sees it, and the free
path beats a paid turn. Pick one:

- **ACP Replay scenario** (free, in the picker): `showcase`, `todo-list`, `approval`,
  `question`, `multi-turn`. Start `vp run dev`, then `Ctrl+Alt+Shift+R`, or
  `window.t3dev.replay("<scenario>")` with `preview_evaluate`, or
  `node apps/server/src/bin.ts thread start --base-dir .t3 --provider devReplay
  --model <scenario> <project> "go"`.
- **Pi-path fixture** (free, focused test, not in the picker): `pi_chat_demo` is the chat
  demo recorded on Pi — two turns where the second repeats a marker only the first turn
  established. Use it when the slice touches chat rendering or thread history, and cite
  `vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`.
  The picker plays ACP transcripts only, so a Pi RPC fixture never appears in it.
- **Real Pi turn** (a few cents) when the slice depends on live provider behavior.

Then state what to look for: the two or three things in the capture below that prove it.
New scenarios go through the fixture route in
[AGENTS.md](../AGENTS.md#replay-never-pay-to-see-a-turn), not by hand-writing frames.

## Reference captures

Before/after images for anything visible; a short recording for anything with motion or
timing. A server-only change with no visible surface gets the focused test plus a short
runtime transcript instead.

## Reject criteria

Name the things that make this slice wrong, so a night agent does not argue itself past them.

- Fails `vp run check:changed`, or a repo-wide check was run instead of the focused one.
- Reintroduces anything on [the cut list](../AGENTS.md#the-cut-list-fork-rule-never-reintroduce).
- Reuse-first audit has an empty row, or a row claims "no" without the one-line justification.
- New abstraction where an existing service method or `components/ui` variant would have done.
- No focused test for a backend behavior change, or a UI test for a nitpick instead of a capture.
- Run-report missing, or it lists checks that were not actually run.

## What we reused

Three rows, filled before any code. Custom code is allowed only after all three fail.

| Question                                                 | Answer | Where |
| -------------------------------------------------------- | ------ | ----- |
| Core primitive (`contracts`, `shared`, `client-runtime`) |        |       |
| Upstream module (existing service, one method added)     |        |       |
| Existing component (`components/ui`, feature component)  |        |       |

CUSTOM: <what is genuinely new, and the one-line justification>.

## Patterns and model files

- Patterns followed: <server `Context.Service` + `Layer`, contracts `Schema`, web `variant`/`size` + tokens, …>
- Files added or renamed: <list every one, so review can tell a new abstraction from a new call site>

## Run report

Lives in the PR body, not here. Three lines:

```
Ran:   vp run check:changed; vp test run <files>; <manual steps>
Passed: <counts and results, not "all green">
Untouched: <files and surfaces deliberately left alone>
```
