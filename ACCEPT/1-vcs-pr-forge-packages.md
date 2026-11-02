# ACCEPT/1-vcs-pr-forge-packages

TS0 PR4a — the forge clients are gone. `source-control-github`, `-gitlab`, `-azure-devops`,
`-bitbucket`, `-forgejo`, `-gitcafe`, and `-testing` are deleted outright, and the server registers
no host at all. Written from [template.md](template.md) against [adhorodyski/botki#1](https://github.com/adhorodyski/botki/issues/1)
(PR4 of that issue's plan). **This is the first half of PR4 and it stops at the issue's own STOP
rule** — see [Where this stops](#where-this-stops).

## What this slice is

Six forge packages, plus the one seam that let them go without touching orchestration:

- **Deleted packages** — every host's CLI/API/GraphQL client (~52k lines of source, ~4.6 MB).
- **The seam** — `source-control-definitions/registry` keeps its import path (the cherry-pick rule)
  and now builds `makeSourceControlDefinitionRegistry([])`. `apps/server/src/sourceControl/sourceControlDefinitions.ts`
  keeps its path and exports an empty driver list. Everything that "reads a host" now reads none,
  so `git`, `checkpointing`, `orchestration-v2`, `project`, and `client-runtime` all still compile
  untouched.
- **Dead leaves cut behind it** — knip's exports pass failed with 30 exports whose only consumers
  were the deleted hosts. 17 were wholly dead (deleted, including all of
  `source-control-core/server/pullRequestUtils.ts`); 13 stayed as module-private helpers.
- **CI and tooling** — the `source-control-github generate --check` step in `ci.yml`, its twin in
  `scripts/check-changed.ts`, the workspace list in `knip:check`, the schema ignore globs in
  `vite.config.ts`, and the `source-control-github/schema` entry in `.macroscope/ignore.md`.
- **Their docs** — `docs/internals/pull-request-file-revisions.md` documented per-provider
  `getFileRevisions` behavior across four hosts and linked into deleted source; it went with its
  `docs/README.md` index entry.

The server still starts, still runs turns, and still checkpoints. It just knows no forge.

## Acceptance checklist

- [x] **The forge packages are gone from disk and from every manifest** —
      `ls packages/ | grep source-control` → `source-control-core`, `-definitions`, `-testing` only,
      and `git grep "@t3tools/source-control-\(github\|gitlab\|azure-devops\|bitbucket\|forgejo\|gitcafe\)"`
      → **no matches** in `apps` or `packages`. (`-testing` is a fake-driver testkit, not a host: it
      stays until the `sourceControl/` tests that still use it go with the orchestration cut.)
- [x] **CI no longer runs a step for a deleted package** —
      `grep -n "source-control" .github/workflows/ci.yml` → no matches. Its local twin in
      `scripts/check-changed.ts` went in the same commit, or `check:changed` would have kept
      trying to run `graphqlgen` for a package that no longer exists.
- [x] **The server registers no host, and that is proven, not implied** —
      `vp test run apps/server/src/sourceControl/sourceControlDefinitions.test.ts` → **2 passed**,
      including the new case: an empty driver list, an empty definition list, `parseChangeRequestUrl`
      returns `null` for a GitHub PR URL, and `canonicalRepositoryKey` is the identity.
- [x] **Nothing routes to a forge any more** — the two registry tests that asserted host routing
      (`falls back to a non-origin remote…` expected `azure-devops`; `routes linked subjects to the
      host that serves them` expected GitHub and GitLab providers to resolve) were rewritten to the
      fork's invariant: **any** remote resolves to `unknown` and **no** change request URL is
      claimed. `vp test run apps/server/src/sourceControl` → **5 files, 44 passed**.
- [x] **`source-control-host-secrets` no longer pretends a credential can resolve** — its four
      per-host tests were replaced with the three that still mean something with no registered
      hosts: no credential fields are registered, a saved credential blob passes through untouched
      with the resolver never called, and unreadable settings still invalidate with `undefined`.
- [x] **Kept code compiles with the hosts gone** — `vp run typecheck` across all **30** workspace
      packages (down from 37), and knip's two commands both pass, including the exports pass that
      forced the 30-export sweep.
- [x] **The credentialed-media asset path was cut honestly** — `AssetAccess.test.ts`'s "serves a
      host's credentialed media through that host's driver" test built a fake GitHub driver to
      fetch bytes. With no hosts there is nothing to fetch, so the test and its fixture imports are
      deleted; the sibling test that asserts media **no** host claims is refused without echoing the
      URL stays, and still passes. `vp test run src/assets/AssetAccess.test.ts` → **34 passed**.
- [x] **`pnpm-lock.yaml` matches every manifest** — verified with CI's own gate, not just a
      regeneration: `CI=true vp install --ignore-scripts` prints **"Lockfile is up to date"**, and
      the diff is 234 deleted lines and zero additions. Per PR3's lesson, the regeneration happened
      after the last `package.json` edit; `check:changed` cannot see a stale lockfile.
- [x] **The Pi path still replays** —
      `vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts` →
      **9 passed**, `pi_chat_demo` included. Nothing here renders, so this is the proof the
      provider/orchestration path is intact.
- [x] `vp run check:changed` green, and the run-report in the PR body

## Replay scenario

`pi_chat_demo`, the free Pi-path fixture, cited rather than re-recorded:

```sh
vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo
```

This PR removes no renderer, so there is nothing new to look at; what it could plausibly break is
the server's layer graph losing every host driver. The fixture's second turn repeating a marker
only the first turn established is the evidence that the Pi adapter, orchestration, and thread
history are unaffected. `showcase` in the picker (`Ctrl+Alt+Shift+R`) works if you want to watch a
turn stream anyway.

## Reference captures

None. This slice has no visible surface: the web app's PR UI is deleted in PR4b, so on `main`+this
the UI still renders PR chrome backed by a server that now always answers "unknown host". That is
why this half ships with the routes still present and why the acceptance evidence is tests, not
screenshots — see [Reject criteria](#reject-criteria) for the one thing this must not be confused with.

## Where this stops

The issue's PR4 line carries the STOP rule: _"If a cut forces editing orchestration-v2 runtime
LOGIC (beyond removing imports, wiring, and stub re-exports), STOP and report the exact symbol."_
It fires, and it fires early. `apps/server/src/pullRequest/` and the rest of `sourceControl/`
cannot be deleted without rewriting orchestration, because these symbols are **read inside** it:

| Blocking symbol                                                                             | Read inside orchestration-v2 at                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PullRequestService.PullRequestService`                                                     | `RunFinalizationService.layerObserver` — `refreshAfterTurn: pullRequests.refreshAfterTurn`, plus `vcsStatus.refreshPullRequestStatus(cwd)` inside `refresh`; `ThreadSettlementService` (`pullRequestSettles`, the settle-on-merge decision); `ThreadPullRequestService`; both PR reactors |
| `threadPullRequestsOf`, `applyThreadPullRequestLinkUpdate`, `normalizeThreadPullRequestKey` | `Orchestrator.ts` (23 sites, the event fold: `withPullRequestWatch`, `legacyPullRequestLink`, `dispatch.pullRequestWatchSync`) and `ProjectionStore.ts` (4 sites, projection fold)                                                                                                        |
| `sourceControlDefinitions`                                                                  | `ThreadSettlementService.pullRequestMatchesProject`, `ThreadPullRequestService`, `PullRequestSyncReactor`                                                                                                                                                                                 |
| `sourceControlHostSecrets`, `SourceControlRepositoryService`                                | reached only through `server.ts`/`ws.ts` wiring, but kept alive by `sourceControl/` files orchestration imports                                                                                                                                                                           |

That is ~420 references across 10 non-test files in `orchestration-v2`, and `ThreadSettlementService`
and `RunFinalizationService.layerObserver` are behavioral rewrites, not import deletions. Per the
rule I stopped rather than rewriting them. **The owner's decision is needed**: either (a) authorize
the orchestration-v2 PR-logic rewrite as its own slice, or (b) let the PR entities live inert, which
is what this PR leaves in place.

I also deliberately did **not** stub `PullRequestService` to satisfy the compiler. Its interface is
41 methods; an inert implementation would keep the entire forge surface alive behind a no-op mask
and knip could not tell a dead surface from a cut one — the exact failure mode the cut list exists
to prevent.

One cut-list item is therefore left standing: `packages/source-control-testing`. It is a fake-driver
testkit rather than a host, and `SourceControlProviderRegistry.test.ts` and
`SourceControlDiscovery.test.ts` build their registries from `fakeSourceControlProvider` and
`TestSourceControlHost`. Those two modules are themselves deleted with the orchestration cut above,
so the testkit goes in that PR; deleting it here would mean hand-rolling fakes to test a surface
that is about to be removed.

## Reject criteria

- Fails `vp run check:changed`, or a repo-wide check was run instead of the focused one.
- **Orchestration-v2 runtime logic edited in this PR.** If the diff contains a behavioral change to
  `Orchestrator.ts`, `ThreadSettlementService.ts`, `RunFinalizationService.ts`, or
  `ProjectionStore.ts`, this PR ignored the STOP rule.
- An inert `PullRequestService` or forge stub added to silence a typecheck instead of being
  reported as the blocker.
- `source-control-core` deleted in this PR. `GitManager`, `checkpointing`, and `client-runtime`
  (which the mobile app imports) still need its `shared/definition` and `VcsProcess` types; that
  deletion belongs with the orchestration cut that removes those call sites.
- A renderer or route deleted to make a typecheck pass, or the web PR surface half-deleted.
- A lockfile that passes `check:changed` but not `CI=true vp install --ignore-scripts`.
- Reuse-first audit has an empty row, or a row claims "no" without a justification.
- Run-report missing, or it lists checks that were not actually run.

## What we reused

| Question                                                 | Answer                                                                                                          | Where                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | Yes — `makeSourceControlDefinitionRegistry([])` is upstream's own factory, already defined to work for no hosts | `packages/source-control-core/src/shared/definition.ts`     |
| Upstream module (existing service, one method added)     | Yes — no service gained a method; the driver list and definition registry are simply empty                      | `apps/server/src/sourceControl/sourceControlDefinitions.ts` |
| Existing component (`components/ui`, feature component)  | N/A — this slice ships no UI. The web half (PR4b) reuses existing rows for what it keeps                        | —                                                           |

CUSTOM: the empty-registry seam in
`packages/source-control-definitions/src/registry.ts`. Justification: the cut itself — the
stub-not-delete rule says core paths keep resolving so upstream cherry-picks continue, and an empty
registry is the smallest thing that keeps every `sourceControlDefinitions.x()` call site compiling
while answering "no host" to all of them.

## Patterns and model files

- Patterns followed: contracts stay `Schema` structs untouched by this PR (PR entities are inert, not
  stubbed, so no schema changed shape); server keeps `Context.Service` + `Layer` graphs with the host
  drivers simply absent; no new abstraction, no new service, no new component.
- Files added: `ACCEPT/1-vcs-pr-forge-packages.md`.
- Files renamed: none.
- Files deleted: 159 — six forge packages (`-github` 64, `-gitlab` 23, `-azure-devops` 19,
  `-bitbucket` 17, `-forgejo` 17, `-gitcafe` 17), `source-control-core/server/pullRequestUtils.ts`,
  and `docs/internals/pull-request-file-revisions.md`.
- Model files: `packages/source-control-core/src/shared/definition.ts` for how the registry degrades
  to `UNKNOWN_SOURCE_CONTROL_CLIENT`, and `ACCEPT/3-cloud-account-surface.md` for the cut-and-report
  shape this PR copies.
- Deliberately untouched: `apps/server/src/{vcs,pullRequest,triage,review}` and the PR-shaped logic
  in `orchestration-v2` (the STOP); `apps/web` and `apps/mobile` entirely (PR4b and TS9); every
  contracts PR/threadPullRequest/review/vcs schema; `packages/source-control-core` except its dead
  leaves; the editor surface (PR5).

## Run report

Lives in the PR body.
