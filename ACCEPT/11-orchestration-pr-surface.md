# ACCEPT/11-orchestration-pr-surface

TS0 PR4c — orchestration-v2 asks a forge nothing. Written from
[template.md](template.md) against
[#11](https://github.com/adhorodyski/botki/issues/11), the half of PR4 that PR4a
([ACCEPT/1-vcs-pr-forge-clients.md](1-vcs-pr-forge-clients.md)) stopped at under the STOP rule.

## The one judgement that decides everything

`thread.pull-request-link-updated` is a **persisted domain event** with real rows in real
databases. The Schema and the event type stay. The **fold became inert**: replaying the event
decodes and changes nothing. Behavior that produced or consumed PR state is gone.

## What this slice is

Deleted:

- `orchestration-v2/pullRequestWatch.ts`, `PullRequestWatchReactor.ts`, `PullRequestSyncReactor.ts`,
  `ThreadPullRequestService.ts` (+ their tests, ~1435 lines of PR-watching tests out of
  `runtimeLayer.test.ts`), and their wiring in `server.ts` and `ws.ts`.
- `ProjectionStore.getThreadsWithPullRequests` and the `ProjectionThreadPullRequests` type; the
  `pullRequests` argument of `derivePendingBackgroundWork`; `PendingBackgroundWorkPullRequest`;
  `applyThreadPullRequestLinkUpdate` (knip caught it stranded).

Removed behavior:

- `RunFinalizationService` — no `refreshAfterTurn`, no `refreshPullRequestStatus`; the observer is
  workspace + local status only.
- `ThreadSearch` — the SQL stops reading `$.pullRequests`, `$.linkedPullRequest`,
  `$.branchPullRequest` from payload.
- `LegacyV1ThreadImporter` — no longer reads `projection_thread_pull_requests` or the two link
  columns; imports `pullRequests: []`. The repair-SQL predicate keys stay present, because
  removing them would re-repair every row forever.
- `ThreadSettlementService` — `pullRequestSettles`, `settlementPullRequestLinks`,
  `pullRequestMatchesProject`, the `GitManager`/`PullRequestService`/`sourceControlDefinitions`
  reads, the shell-close `Set`, and the merge-event subscription are gone. The sweep keys on
  activity plus `sidebarAutoSettleKeepPullRequests` only.
- `ProjectionStore` — the `thread.pull-request-link-updated` fold is a no-op in both the pure fold
  and the SQL apply path; `getThreadsWithPullRequests` deleted (no caller survived); the
  shell-index liveness predicate no longer counts a stored `watch`.
- `packages/shared/orchestrationV2PendingBackgroundWork` — `pullRequestWatchTasks` deleted. A
  stored watch can never be cleared now, so leaving it would hang those threads in Working forever.
  Same reason in `client-runtime/state/threadExecution` and `web/components/ChatView.logic`.
- `autoSettlementConfigured` / `autoSettlementSettingsKey` ignore `sidebarAutoSettleOnMerge`. The
  settings field stays in the schema for stored rows; it decides nothing.

Kept: every PR `Schema`, the event types, `projection_thread_pull_requests` and migrations
042/048/050/053/061/064, `visibleThreadPullRequests` / `threadPullRequestsOf` as inert data
accessors, and `thread.pull-request-synced` in `SUPERSEDABLE_THREAD_EVENT_TYPES`.

## Settlement decision, stated

A thread that used to settle the moment its PR merged now **stays open** until the inactivity
window elapses, and **never settles earlier**. Proven as a table, not prose:
`resolveAutoSettlementAt` cases in `ThreadSettlementService.test.ts` ("never settles … earlier than
inactivity allows", "keeps … from inactivity settlement while retention is on").

## Acceptance checklist

- [x] **Historical replay survives** —
      `vp test run apps/server/src/orchestration-v2/testkit/PullRequestHistoryReplay.test.ts` → 2 passed.
      The fixture is a **capture from the owner's live database** (two threads, 52 events, 48 of them
      `thread.pull-request-link-updated`, scrubbed of account/repo/host names) appended to a fresh
      store and pushed through `ProjectionMaintenance.rebuild` — the same fold boot recovery runs.
      `valid: true`, `unreadableThreadIds: []`, `missingThreadIds: []`, `unexpectedThreadIds: []`,
      and no thread ends up with awaited background work.
- [x] **Replay against the real database** — rebuilt the projections of a _copy_ of
      `~/.t3/userdata/statev2.sqlite` (57,211 events, 8 threads with live PR links, 22 threads):
      `before` and `after` both `valid: true`, `projectionSequence: 57211`, zero unreadable,
      missing, or unexpected threads. Migrations 73–76 applied cleanly on the copy.
- [x] **`pi_chat_demo` still passes** —
      `vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`
      → 1 passed, 8 skipped.
- [x] **Settlement regression table** — see above;
      `vp test run apps/server/src/orchestration-v2/ThreadSettlementService.test.ts` → 24 passed.
- [x] **The five files the issue ordered 1-7 ask nothing of a forge** —
      `grep -rn "PullRequestService\|sourceControlDefinitions\|threadPullRequestWatch\|refreshAfterTurn\|branchPullRequest(" apps/server/src/orchestration-v2/{RunFinalizationService,ThreadSearch,ThreadSettlementService,ProjectionStore,legacy/LegacyV1ThreadImporter}.ts` → **no matches**. `Orchestrator.ts` is layer 8 and still holds the PR link commands (see Boundary).
- [x] **`knip:check` green** — it caught one stranded export
      (`applyThreadPullRequestLinkUpdate`), which is now gone.
- [x] **`CI=true vp install --ignore-scripts`** → "Lockfile is up to date" (no manifest edited).
- [x] **`vp run check:changed` green at every commit.**
- [ ] **`git grep -n "watch_pull_request\|watchPullRequest" apps/server/src/mcp` → no matches** — NOT
      done; see Boundary. This is layer 9's file.
- [ ] **`vp run dev` boots with zero log errors** — not run here; the rebuild-against-a-copy result
      above is the stronger, cheaper proof of the same thing. Run it on this branch if you want the
      transcript in the PR.

## Boundary — where the STOP rule bites again

The issue's layer 8 (`Orchestrator.ts`, 100 refs) and layer 9 (`ws.ts` ~87 refs,
`mcp/toolkits/pullRequests`, `apps/server/src/{pullRequest,vcs,triage,sourceControl,review}`)
**are not in this PR**, for one concrete reason: `apps/mobile` (TS9 scope) still dispatches
`thread.pull-request.link/unlink/watch`, still calls `WS_METHODS.pullRequestsSummary` and
`pullRequestsSubscribeRefreshes`, and reads `capabilities.threadPullRequestWatch` — 11 mobile files
break typecheck the moment those method names disappear, and CI typechecks mobile.

What I checked before stopping, so the cut is safe to finish later:

- **Commands are not durable the way events are.** `orchestration_v2_command_receipts` stores only
  `command_type` as TEXT — no command payload is ever decoded again. So deleting the PR
  _commands_ from the `OrchestrationV2Command` union cannot corrupt replay. Unlike events, they are
  free to go.
- **No pending work is stranded.** `orchestration_v2_effect_outbox` in the live DB holds 0
  PR-shaped effects (all rows terminal).
- Layer 8 therefore needs no new behavior; it is deletion plus mobile's removal (TS9), or a stub
  window where the RPC names survive and return empty.

I did **not** invent behavior to keep history-replay integrity beyond the one inert fold the issue
authorized. Nothing else needed inventing.

## Pre-existing failure, not mine

`apps/server/src/orchestration-v2/ProjectionRecovery.test.ts > selects unfinished recovery work…`
fails with `malformed JSON` from a `json_array_length` read. It fails identically on unmodified
`main` (`/Users/adhorodyski/Developer/botki`, `2d191ca98`). Not caused by this branch.

## Replay scenario

Free, focused test, no paid turn:
`vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`
and `vp test run apps/server/src/orchestration-v2/testkit/PullRequestHistoryReplay.test.ts`.
What to look for: the capture's 48 link-refresh events fold with zero projection errors, and the
two captured threads come back as settlement candidates with empty `pendingBackgroundTasks` — i.e.
old PR history neither breaks boot nor pins a thread open.

## What we reused

| Question                                                 | Answer | Where                                                                                                                                                                                                       |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | yes    | Reused the existing `OrchestrationV2DomainEventJson` decode and `ProjectionMaintenance.rebuild` for the replay proof; deleted `shared`'s PR branch of `derivePendingBackgroundWork` rather than forking it. |
| Upstream module (existing service, one method added)     | yes    | No new service. `ThreadSettlementService` and `ProjectionStore` lost methods; nothing was added to any service.                                                                                             |
| Existing component (`components/ui`, feature component)  | n/a    | Server-only slice; zero new UI.                                                                                                                                                                             |

CUSTOM: the no-op fold in `ProjectionStore`, the inert-`watch` rule in
`derivePendingBackgroundWork`, and the captured-stream fixture. Justification: the cut itself —
each is the minimum that keeps durable rows from becoming broken behavior.

## Patterns and model files

- Server `Context.Service` + `Layer` with layers simply absent; `Effect.fn("Service.operation")`
  span names preserved on every surviving service (`ThreadSettlementServiceV2.sweep`,
  `ProjectionStore.*`).
- Model files: `ACCEPT/1-vcs-pr-forge-clients.md` (cut-and-report shape, the STOP boundary this
  starts from) and `ACCEPT/4-web-pr-ui.md` (what a completed half of PR4 looks like).
- Files added: `ACCEPT/11-orchestration-pr-surface.md`,
  `apps/server/src/orchestration-v2/testkit/PullRequestHistoryReplay.test.ts`,
  `apps/server/src/orchestration-v2/testkit/fixtures/pull_request_history/thread_events.ndjson`.
- Files deleted: `orchestration-v2/pullRequestWatch.ts`, `PullRequestWatchReactor.ts`,
  `PullRequestSyncReactor.ts` (+2 tests), `ThreadPullRequestService.ts` (+1 test).
- No renames. No new migrations.

## Reject criteria

- A PR that deletes the `ThreadPullRequestLink` / `ThreadLinkedPullRequest` schemas or the two
  event types — that is data loss on real databases, not cleanup.
- A PR that drops `projection_thread_pull_requests` or edits migrations 042–064.
- A PR that makes a stale stored `watch` count as awaited work again; those threads never settle.
- A PR that settles a thread earlier than its inactivity window because a PR "merged".
- A PR that reaches into mobile, or stubs an RPC to keep mobile compiling without saying so.
