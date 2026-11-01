# ACCEPT/2-night-agent-contract

TS1b — Night agents can close an ACCEPT on their own. This file is written from
[template.md](template.md) and is itself the proof: the slice's deliverable is the
contract, so the slice's ACCEPT must exist and pass or the contract is a lie.

Issue: [adhorodyski/botki#2](https://github.com/adhorodyski/botki/issues/2)

## Acceptance checklist

- [x] `AGENTS.md` in the fork: verified trim of upstream's (212 → 172 lines, cap 300), product vocabulary (bot / team / ask-assign / hand-off / needs-you / routine / provider), reuse-first rule (three questions + audit table), patterns rule (server `Context.Service` + `Layer`, contracts `Schema`, naming, component style + design tokens, colocated tests, model files per change), night-run conventions, fork-only cut rule — `wc -l AGENTS.md` → **172**; every doc, skill, and lint-rule name it cites exists (`ls docs/internals/`, `ls oxlint-plugin-t3code/rules/`)
- [x] `ACCEPT/template.md` in repo root with acceptance checklist, Replay scenario, reference captures, reject criteria, "what we reused", "patterns + model files", run-report convention, and the `ACCEPT/<issue-number>-<slug>.md` naming rule — this file is generated from it
- [x] First Replay scenario recorded on the Pi path (chat demo) + `test-t3-app` renamed and rewritten as `test-botki-app`, with the capture convention `ACCEPT/captures/<issue>/` — `vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts` → **9 passed**, `pi_chat_demo` among them; the same two-turn chat verified live in the browser panel on Pi/Haiku 4.5, and captured below
- [x] An ACCEPT exists for TS1b itself and passes — this file, and every claim in it has a command above
- [x] Issue-spec template frozen as `.github/ISSUE_TEMPLATE/spec.md` (user story, demo, acceptance checklist, reuse-first audit table, patterns + model files, out of scope, dependencies) + PR template mirrors it (reuse table filled + run-report footer) — `ls .github/ISSUE_TEMPLATE/spec.md .github/pull_request_template.md`
- [x] Labels exist: `slice`, `night`, `needs-accept`, `agent-context-increase` — `gh label list --repo adhorodyski/botki --json name --jq '.[].name' | grep -E '^(slice|night|needs-accept|agent-context-increase)$'` → all four
- [ ] `vp run check:changed` green, run-report in the PR body

## Replay scenario

Two ways to see the same demo, and they are not interchangeable:

- **Recorded, free, headless:** the `pi_chat_demo` fixture. `vp test run
  apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`.
  It is a Pi RPC transcript, so it does **not** appear in the `Ctrl+Alt+Shift+R` picker: that
  provider plays ACP transcripts. Confirmed in the browser: `window.t3dev.replay("pi_chat_demo")`
  throws `Unknown replay scenario`, while the picker lists `showcase`, `todo-list`, `approval`,
  `question`, `multi-turn`. Wiring a Pi fixture into the picker would mean a second replay agent,
  which the spec's "zero product code" audit rules out, so the demo path is the test plus a live turn.
- **Live, in the UI:** `vp run dev`, enable Pi in Settings → Providers, pick
  `anthropic/claude-haiku-4-5-20251001`, and send the fixture's two prompts.

What to look for either way: turn one answers `botki chat marker stored`; turn two answers
`botki chat demo complete botki-chat-demo-9F4K`. The marker exists only in turn one's prompt,
so a second-turn answer that repeats it proves the thread carried history.

This is a real recording, not a hand-written transcript: `record:pi-replay` drove the `pi`
binary (1.4.0) over `anthropic/claude-haiku-4-5-20251001` for two turns and normalized the
result. 109 entries, `pi.rpc-jsonl`, at
`apps/server/src/orchestration-v2/testkit/fixtures/pi_chat_demo/pi_transcript.ndjson`.

Proof the assertion is load-bearing rather than vacuous: replacing `PI_CHAT_DEMO_MARKER` with
`"NOT-A-REAL-MARKER"` in `assertPiChatDemoOutput` fails with
`AssertionError: expected 'botki chat demo complete botki-chat-d…' to include 'NOT-A-REAL-MARKER'`.
Reverted after confirming.

## Reference captures

`ACCEPT/captures/2/pi-chat-demo-turn-2.png` — the rendered thread after a `pi_chat_demo`
replay, showing both turns and the recalled marker.

## Reject criteria

- `AGENTS.md` over 300 lines, or it names a file, doc, lint rule, or command that does not exist.
- Any upstream cut-path reintroduced, or the cut list softened so a future agent can re-add one.
- Transcript hand-authored, or recorded from a provider other than Pi.
- `assertPiChatDemoOutput` passing on an empty or trivial transcript (checked by mutation, above).
- Reuse-first audit rows left blank, or a "no" without a one-line justification.
- `AGENTS.md` grown past 300 lines, or grown at all where a cut would do. Nothing in CI measures
  this file: `agent-context-budget` measures the harness text we inject, so the cap here is a
  review bar, not a green check.

## What we reused

| Question           | Answer                                                                                                                                                                                                                                      | Where                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Core primitive     | No — nothing in `contracts`/`shared`/`client-runtime` models a contract file; `ProviderReplayTranscript` and `ProviderReplayNdjsonRecord` are reused rather than extended                                                                   | `packages/contracts/src/orchestrationV2.ts`                       |
| Upstream module    | Yes for the recording path: `record-pi-rpc-replay-fixture.ts`, `PiAdapterV2.testkit.ts`, `ProviderReplayFixtures.ts`, and `AgentContextBudget.test.ts` all already exist; this slice adds a fixture entry and two modules, no new machinery | `apps/server/scripts`, `apps/server/src/orchestration-v2/testkit` |
| Existing component | Yes for the demo surface: the Browser panel and `DevReplayHost` scenario picker already render this; nothing new is drawn                                                                                                                   | `apps/web/src/components/DevReplayHost.tsx`                       |

CUSTOM: markdown rule text (`AGENTS.md`, `ACCEPT/`, the two templates) and one new Replay
fixture (justification: the spec asks for a scenario recorded on the Pi path, and no existing
Pi fixture exercises the plain two-turn chat-with-history demo the ACCEPTs will replay). Zero
product code, zero new abstractions — the fixture is data plus assertions in the harness's own
idiom. `.agents/skills/test-t3-app` was renamed to `test-botki-app` and rewritten rather than
duplicated (the inbound link from `test-t3-mobile` was updated in the same commit).

## Patterns and model files

- Patterns followed: fixture registered in `ORCHESTRATOR_REPLAY_FIXTURES` like its neighbours;
  `input.ts`/`output.ts` split and prompt constants in `input.ts` as `pi_compaction` does;
  assertion built from the existing `assert*` helpers in `fixtures/shared.ts` plus
  `assertPiSettledTokenUsage`; reuse of upstream's `record:pi-replay` script unchanged; docs
  written in upstream's imperative voice, not a new house style.
- Files added: `ACCEPT/template.md`, `ACCEPT/2-night-agent-contract.md`,
  `.github/ISSUE_TEMPLATE/spec.md`,
  `apps/server/src/orchestration-v2/testkit/fixtures/pi_chat_demo/{input.ts,output.ts,pi_transcript.ndjson}`,
  `ACCEPT/captures/2/pi-chat-demo-turn-2.png`
- Files renamed: `.agents/skills/test-t3-app/` → `.agents/skills/test-botki-app/`
- Files rewritten: `AGENTS.md`, `.github/pull_request_template.md`,
  `.github/ISSUE_TEMPLATE/config.yml` (upstream's points at `pingdotgg/t3code` Discussions, which
  this fork does not have enabled)
- Files edited: `.github/ISSUE_TEMPLATE/bug_report.yml` (same dead Discussions link)
- Files edited: `apps/server/src/orchestration-v2/testkit/fixtures/index.ts` (fixture
  registration + imports), `.agents/skills/test-t3-mobile/SKILL.md` (one link)

## Open for the owner

Two things this slice could not close on its own, recorded here rather than papered over:

1. **The cut list in `AGENTS.md` describes the post-TS0 tree, and TS0 (#1) has not merged.** The
   file now says so in that section. Its final pass is the serialization point the issue already
   named, and it should re-check every path claim once PR3-PR5 land.
2. **`pi_chat_demo` cannot be replayed from the picker.** The free dev provider speaks ACP; the
   fixture speaks Pi RPC. Making it picker-selectable needs a second replay agent, i.e. product
   code. Deliberately not done here; if you want the picker to cover Pi, that is a slice of its own.

## Run report

See the PR body. Convention: what you ran, what passed, what you did not touch.
