# ACCEPT/1-vcs-pr-forge-clients

TS0 PR4a — the forge **clients** are gone and the server drives no host. Written from
[template.md](template.md) against [adhorodyski/botki#1](https://github.com/adhorodyski/botki/issues/1)
(PR4 of that issue's plan). This is the **server + packages** half; the web UI and `worktreeCleanup`
are PR4b, and the orchestration cut is
[#11](https://github.com/adhorodyski/botki/issues/11).

## What this slice is

- **Deleted** — every host's network client: `src/server/` of `source-control-github`, `-gitlab`,
  `-azure-devops`, `-bitbucket`, `-forgejo`, and `-gitcafe` (~52k lines of CLI, REST, GraphQL, and
  App-sign-in code), plus GitHub's GraphQL schema and its `generate` step.
- **Kept on purpose** — each package's `src/shared/`: the pure URL grammar and host terminology.
  That half does no network I/O, and `client-runtime` builds on it for 58 web and 50 mobile files,
  while server project-identity normalization and saved thread links read remotes through it.
  Deleting it is what broke CI the first time.
- **The seam** — `BUILT_IN_SOURCE_CONTROL_DRIVER_LIST` becomes empty, so nothing is probed, listed,
  or signed in to. It keeps its import path (cherry-pick rule) and its `ReadonlyArray<SourceControlDriver>`
  annotation, without which the empty tuple degrades `Effect.forEach` inference across the tree.
- **Dead leaves behind it** — knip's exports pass named 13 exports whose only consumers were the
  deleted clients: 11 wholly dead (deleted, including `mergeMessage.ts`, `pullRequestUtils.ts`, and
  `pullRequestChecks.ts`), 2 kept as module-private helpers.
- **CI and tooling** — the `source-control-github generate --check` step in `ci.yml` and its local
  twin in `scripts/check-changed.ts`, the `knip:check` workspace list, `knip.jsonc`'s codegen entry,
  the schema ignore globs in `vite.config.ts`, and the `.macroscope` ignore entry.

## Acceptance checklist

- [x] **No host can be driven** — `vp test run apps/server/src/sourceControl` → **5 files, 45
      passed**, including the new case: the driver list is empty while
      `parseChangeRequestUrl` still reads a GitHub PR URL and `recognizeRemote` still names
      `gitlab`. Emptying the registry instead of the driver list is the wrong cut and fails 30+ tests.
- [x] **The 6 server test files CI failed on now pass, untouched** —
      `vp test run src/serverSettings.test.ts src/git/GitManager.test.ts
      src/orchestration-v2/runtimeLayer.test.ts src/project/RepositoryIdentityResolver.test.ts
      src/pullRequest/linkedThreads.test.ts src/pullRequest/PullRequestService.test.ts` →
      **51 / 114 / 108 / 11 / 1 / 108 passed**. All six pass with **no edits to those files**:
      `git status` shows only `sourceControlDefinitions.test.ts` modified among server tests.
      Restoring behavior rather than rewriting assertions is the evidence the boundary is right.
- [x] **The 10 web test files CI failed on pass, untouched** —
      `pullRequestDetail.logic` 72, `PullRequestActionsMenu` 6, `DesktopWebLinkCoordinator` 10,
      `pullRequestList.logic` 34, `GitActionsControl.logic` 13, `ChatMarkdown.permissions` 5,
      `ChatMarkdown` 13, `composerContextRecords` 14, `settingsSearch` 21,
      `pullRequestMarkdown.logic` 1 — all green, all unmodified.
- [x] **The kept URL grammar is still tested** —
      `vp test run src/sourceControlClients.test.ts src/pullRequestLinkInput.test.ts
      src/state/gitActions.test.ts src/threadPullRequests.test.ts` (client-runtime) →
      **4 files, 85 passed**.
- [x] **Nothing references deleted code** — typecheck green across **36** packages, and
      `grep -rl "\b(mergeMessage|pullRequestUtils|layerWithRealGit|runForReal|sourceBranch|
      sourceControlRefFromInput|combinedAuthOutput|defineSourceControlDriver|withOwnServices|
      settingsSecretLiteral)\b"` → **0 matches** repo-wide. The surviving `pullRequestChecks`
      matches are an unrelated contracts capability (`capabilities.pullRequestChecks`).
- [x] **CI no longer runs a step for deleted code** — `grep -n "source-control" .github/workflows/ci.yml`
      → no matches, and `check:changed`'s own `graphql (packages/source-control-github)` gate is gone
      or it fails the local run.
- [x] **`pnpm-lock.yaml` matches every manifest** — `CI=true vp install --ignore-scripts` prints
      **"Lockfile is up to date"**, regenerated after the last `package.json` edit.
- [x] **The Pi path still replays** — `vp test run
      apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts` → **9 passed**,
      `pi_chat_demo` included.
- [x] `vp run check:changed` green, and the run-report in the PR body

## Replay scenario

`pi_chat_demo`, cited rather than re-recorded:

```sh
vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo
```

No renderer changes here, so there is nothing new to look at. What this could plausibly break is the
server's layer graph losing every host driver; the fixture's second turn repeating a marker only the
first established is the evidence the Pi adapter, orchestration, and history are unaffected.

## Reference captures

None — no visible surface. The web app's PR UI is deleted in PR4b, so on `main` + this the UI still
renders PR chrome, now backed by a server that drives no host. Evidence is tests plus the boot
transcript in the run report.

## Where this stops

The STOP rule still fires for the rest of PR4's list. `apps/server/src/{pullRequest,sourceControl,vcs,triage,review}`
cannot go without rewriting orchestration-v2 runtime logic, which
[#11](https://github.com/adhorodyski/botki/issues/11) now owns. Read inside orchestration today:
`PullRequestService.PullRequestService` (`RunFinalizationService.layerObserver`,
`ThreadSettlementService.pullRequestSettles`), `threadPullRequestsOf` /
`applyThreadPullRequestLinkUpdate` / `normalizeThreadPullRequestKey` (`Orchestrator.ts` event fold,
`ProjectionStore.ts`), and `sourceControlDefinitions`. `packages/source-control-{core,definitions,testing}`
also stay: `shared/` is live for the reasons above, and the testkit builds the registries that
`SourceControlProviderRegistry.test.ts` and `SourceControlDiscovery.test.ts` still exercise.

## Reject criteria

- Fails `vp run check:changed`, or a repo-wide check run instead of the focused one.
- **The definition registry emptied instead of the driver list.** The tell is rewritten assertions
  in `serverSettings`/`GitManager`/`runtimeLayer`/`RepositoryIdentityResolver` tests: those files
  must pass unmodified. If they were edited to accept `unknown` where they asserted a host, this PR
  cut the wrong layer.
- **Orchestration-v2 runtime logic edited here** — a behavioral change to `Orchestrator.ts`,
  `ThreadSettlementService.ts`, `RunFinalizationService.ts`, or `ProjectionStore.ts` means the STOP
  was ignored.
- An inert `PullRequestService` or forge stub added to silence a typecheck rather than reported.
- A renderer or route deleted to make a typecheck pass, or the web PR surface half-deleted.
- A lockfile that passes `check:changed` but not `CI=true vp install --ignore-scripts`.
- Run-report missing, or listing checks that were not run.

## What we reused

| Question                                                 | Answer                                                                                           | Where                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | Yes — `client-runtime`'s `sourceControlClients` reuses the kept registry; nothing re-implemented | `packages/client-runtime/src/sourceControlClients.ts`       |
| Upstream module (existing service, one method added)     | Yes — no service gained a method; the driver list is simply empty                                | `apps/server/src/sourceControl/sourceControlDefinitions.ts` |
| Existing component (`components/ui`, feature component)  | N/A — this slice ships no UI; PR4b reuses existing rows for what it keeps                        | —                                                           |

CUSTOM: the empty driver list. Justification: the cut itself — the smallest change that makes every
`sourceControlDefinitions.x()` call site compile while removing the ability to talk to a host.

## Patterns and model files

- Patterns followed: contracts keep their `Schema` structs untouched (PR entities stay inert, not
  stubbed); server keeps `Context.Service` + `Layer` graphs with the drivers simply absent; no new
  abstraction, service, or component.
- Files added: `ACCEPT/1-vcs-pr-forge-clients.md`.
- Files renamed: none.
- Files deleted: 129 — `src/server/` of the six host packages, their GraphQL schema and codegen
  config, `source-control-core/{mergeMessage,pullRequestUtils,pullRequestChecks}` and their tests,
  and `source-control-github/scripts/measure-pr-preview.ts`.
- Model files: `packages/source-control-core/src/shared/definition.ts` for the grammar this PR
  deliberately keeps, and `ACCEPT/3-cloud-account-surface.md` for the lockfile and verifier lessons.
- Deliberately untouched: `apps/server/src/orchestration-v2` (STOP; #11),
  `apps/server/src/{vcs,pullRequest,triage,review}`, `apps/{web,mobile,desktop}`, every contracts
  PR/threadPullRequest/review/vcs schema, `packages/source-control-{core,definitions,testing}`,
  the editor surface (PR5), and all workflows besides the one generate step.

## Run report

Lives in the PR body.
