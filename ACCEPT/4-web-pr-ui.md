# ACCEPT/4-web-pr-ui

TS0 PR4b — the web app renders no PR chrome. Written from
[template.md](template.md) against [adhorodyski/botki#1](https://github.com/adhorodyski/botki/issues/1)
(PR4 of that issue's plan). This is the **web UI** half; the forge clients went in PR4a
([ACCEPT/1-vcs-pr-forge-clients.md](1-vcs-pr-forge-clients.md)), and the orchestration cut is
[#11](https://github.com/adhorodyski/botki/issues/11).

## What this slice is

- **Deleted** — `apps/web/src/components/pullRequest/` (111 files: lists, detail, actions menu,
  review chrome, checks, stack, markdown logic), the `pull-requests` route, `state/pullRequests.ts`,
  `state/usePullRequestStack.ts`, the PR hooks (`useOpenPanelPullRequestUrl`,
  `usePullRequestChecksRefresh`, `usePullRequestLinking`, `useSupportsMultiplePullRequests`),
  `PullRequestThreadDialog`, `ThreadDetailsPrRows`, `PullRequestRoutingSettings`, and every
  "Create PR" / "Push & create PR" / link-PR affordance in the composer, toolbar, sidebar row,
  command palette, timeline, settings, and thread menu.
- **Rehomed, not deleted** — `worktreeCleanup.ts` → `lib/worktreePaths.ts`; `isLineInFileDiff` →
  `lib/diffRendering.ts`; `openPullRequestLink.ts` → `lib/openCommitLink.ts` (commit links still
  open in the diff panel, no PR-view routing).
- **Store migrations** — `rightPanelStore` v14→15 and `closedViewStore` v2→3 drop the PR surface
  kinds so old persisted state rehydrates instead of crashing.
- **Kept on purpose** — terminal-as-view, diff view, snippet/markdown rendering, checkpointing UI,
  git status display without the PR flow, `apps/server`, `packages/contracts`, `apps/mobile`. The
  contracts PR schemas stay (inert after PR4a). `reviewCommentContext.pullRequest` stays optional
  so historical persisted records still render.

## Acceptance checklist

- [x] **No PR affordance remains in the web app** —
      `grep -rn "PullRequest\|pullRequest" apps/web/src --include='*.ts*' | grep -v test` → the only
      surviving references are the inert contracts-schema imports, historical-record rendering
      (`composerContextRecords`), and the `reviewCommentContext` optional field. No component,
      route, hook, menu item, or setting renders a PR.
- [x] **The web suite passes** — `vp test run --passWithNoTests --project unit --project browser`
      → **449 files, 4834 passed**. The 8 collection failures (`composerMentionDrag`,
      `workspaceFileDrop`, `fileTreeDragMention`, `platform`, `storage`, `httpLayer`,
      `backgroundActivityReporter`, `npmRelease`) are the same environmental
      `Cannot read properties of undefined (reading 'config')` flakes present on the baseline run
      of unmodified `main`; each passes standalone.
- [x] **Tests adjusted to the fork invariant** — `rightPanelStore.test.ts` PR-surface cases became
      diff-only cases plus a migration test that drops persisted PR surfaces;
      `RightPanelTabs.test.tsx`, `ChatMarkdown.permissions.browser.test.tsx`,
      `DesktopWebLinkCoordinator.browser.test.tsx`, and `BranchToolbar.logic.test.ts` lost their PR
      cases (the behavior is gone, not asserted otherwise).
- [x] **Nothing references deleted code** — `vp run typecheck` → **36 packages, 0 errors**.
- [x] **No dead exports left behind** — `vp run knip:check` → **2/2 successful**. Knip's exports
      pass named 7 web exports whose only consumers were the deleted surface; 5 were deleted, 2
      (`pullRequestContextDisplayState`, `readCachedPullRequestResolution`'s target) kept as
      module-private helpers where historical records still use them.
- [x] **Old persisted state survives the cut** — `vp test run src/rightPanelStore.test.ts` covers
      v14→15 and `closedViewStore` v2→3 dropping PR surfaces on rehydrate.
- [x] **The Pi path still replays** — `vp test run
      apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`
      (unchanged from PR4a; this slice touches no server or adapter code).
- [x] **`packages` edits are knip-forced dead-export removals only** — `stopSubline`
      (client-runtime) and `promptLinkPullRequestUrl` (shared) had no consumer outside the deleted
      web surface; `apps/mobile` typechecks clean without them.
- [x] `vp run check:changed` green, and the run-report in the PR body

## Replay scenario

`showcase` (free, ACP Replay picker) covers the surfaces this slice touched indirectly — chat
rendering, tool activity, plans, markdown:

```sh
vp run dev
# Ctrl+Alt+Shift+R, or window.t3dev.replay("showcase") via preview_evaluate
```

What to look for: (1) the right panel opens diff/terminal/preview surfaces normally and never offers
a PR tab; (2) a commit link in an agent message still opens the diff panel; (3) `git status`-style
source-control presentation rows render with plain git glyphs (no PR icons anywhere). This slice
changes no provider or orchestration behavior, so the Pi-path fixture is cited, not re-recorded.

## Reference captures

The user-facing change is removal, and the proof is negative. The integrated pass is the Replay run
above through the Browser panel: no PR route reachable from any menu, palette entry, sidebar hover,
or thread dialog. Captures live in `ACCEPT/captures/4/` on the PR, not in the tree.

## Where this stops

`apps/server/src/{pullRequest,sourceControl,vcs,triage,review}` and the contracts PR schemas stay,
inert since PR4a — [#11](https://github.com/adhorodyski/botki/issues/11) owns the orchestration cut.
`apps/mobile` still has its `features/pull-requests` screens against the same inert server; it is
deliberately untouched here, as are `packages/source-control-*` shared grammars.

## Reject criteria

- Fails `vp run check:changed`, or a repo-wide check was run instead of the focused one.
- Reintroduces anything on [the cut list](../AGENTS.md#the-cut-list-fork-rule-never-reintroduce) —
  including a stubbed PR service or a "hidden" PR panel behind a flag. Half-deletion is the failure
  mode: a menu item that opens nothing, or a store case with no renderer.
- Deleted a surface that is **not** the PR flow: terminal-as-view, diff view, snippet/markdown
  rendering, checkpointing UI, or plain git status display.
- Edited `apps/server`, `packages/contracts`, or `apps/mobile` beyond the two knip-forced dead
  exports named above.
- Bumped a persisted-store version without a migration that drops the removed kinds.
- Reuse-first audit has an empty row, or a row claims "no" without the one-line justification.
- Run-report missing, or it lists checks that were not actually run.

## What we reused

| Question                                                 | Answer                                                                                          | Where                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Core primitive (`contracts`, `shared`, `client-runtime`) | Yes — commit links reuse `client-runtime`'s commit grammar via a thin wrapper; no re-parse      | `apps/web/src/lib/openCommitLink.ts`             |
| Upstream module (existing service, one method added)     | Yes — no server change; the web simply stops calling the inert PR surface                       | —                                                |
| Existing component (`components/ui`, feature component)  | Yes — remaining toolbar/sidebar/palette rows keep their existing variants; lucide glyphs direct | `components/ui`, `sourceControlPresentation.tsx` |

CUSTOM: `lib/openCommitLink.ts`. Justification: commit links are the only source-control link that
survives the cut, and the old handler's PR routing had to go with them; keeping commit behavior
alive is a smaller change than dropping link handling entirely.

## Patterns and model files

- Patterns followed: web components stay in `components/ui`-owned looks (no restyle-by-className);
  store migrations follow the existing versioned-migration idiom; no new abstraction — deleted
  call sites, not replaced ones.
- Files added: `ACCEPT/4-web-pr-ui.md`, `apps/web/src/lib/openCommitLink.ts`.
- Files renamed: `lib/worktreeCleanup.ts` → `lib/worktreePaths.ts` (+ test).
- Files deleted: **134** — all of `components/pullRequest/` (111), the `pull-requests` route,
  PR state/hooks/dialogs/settings rows, `AnimatedWidth.tsx`, `SourceControlAppAccessNotice.tsx`,
  `ui/preview-card.tsx`, and the orphaned PR link/dialog plumbing.
- Files modified: 68 in `apps/web`, plus `vite.config.ts` (PR-glyph import restriction removed with
  its subject file) and 2 knip-forced dead-export removals in `packages/`.
- Deliberately untouched: `apps/server`, `packages/contracts`, `apps/mobile`, `apps/desktop`,
  orchestration, terminal-as-view, diff view, snippet/markdown rendering, checkpointing UI.

## Run report

Lives in the PR body.
