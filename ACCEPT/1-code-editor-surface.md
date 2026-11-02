# ACCEPT/1-code-editor-surface

TS0 PR5 — nobody edits a file inside Botki. Written from [template.md](template.md) against
[adhorodyski/botki#1](https://github.com/adhorodyski/botki/issues/1) (PR5 of that issue's plan).
PR4a removed the forge clients, PR4b the web PR chrome
([ACCEPT/1-vcs-pr-forge-clients.md](1-vcs-pr-forge-clients.md),
[ACCEPT/4-web-pr-ui.md](4-web-pr-ui.md)); this is the editor half and the last MCP tool cut the
issue asked for.

## What this slice is

- **Deleted** — the VS-style editing surface. `EditableFileSurface` and its `@pierre/diffs/edit`
  mount collapse onto the read-only `ReadOnlySourcePreview` that already existed. With it go the
  debounced save sessions (`fileSaveSessions.ts`), the cross-surface save coordinator
  (`fileSaveCoordinator.ts`), the editor dismissal and virtualization helpers
  (`fileEditorDismissal.ts`, `fileEditorVirtualization.test.ts`), inline review-comment
  annotations (`fileCommentAnnotations.ts`), and the optimistic write layer in
  `projectFilesQueryState.ts` (`optimisticFileAtom`, `confirm/resolve/clearProjectFileQueryData`,
  `getUnsavedProjectFileQueryData`, `unsavedFileMounts`) plus its `SettingsScopeContext` and
  `t3ProjectFileDefaults` read-throughs.
- **Pending/dirty plumbing gone** — the unsaved-dot path had no purpose once nothing is dirty:
  `pendingFileSurfaceIdsByProject` and `handleFilePendingChange` in `ChatView.tsx`, the `pending`
  indicator in `RightPanelTabs.tsx`, `onPendingChange`/`selectedFilePending` in
  `RightPanelSurfaceContent.tsx`, and the read-only banner + `canWriteFiles` gate in
  `FilePreviewPanel.tsx`.
- **MCP toolkit** — `watch_pull_request`, `unwatch_pull_request`, `write_pull_request_guides`,
  `read_pull_request_guide` are out of `toolkits/pullRequests/tools.ts` and `handlers.ts`, along
  with the watch/guide error classes, the `reviewGuides` service dependency, and the
  `hiddenFromSubagents` invocation-context helper those tools alone used. `link_pull_request`,
  `link_pull_requests`, `unlink_pull_request`, `unlink_pull_requests`, and
  `list_thread_pull_requests` stay, so a night agent can still report the PR it opened.
- **Model-facing text moved with the tools** — the `<pull_request_linking>` block in
  `runtimeInstructions.ts`, 8 `muse_transcript.ndjson` replay fixtures re-pinned, 27 `mcp-tool-use`
  eval cases deleted, and `agentContextBudget.json` re-measured down
  (5153→4857, 6883→6587, 47538→45382 bytes).
- **Kept on purpose** — markdown/mermaid/table/media/PDF-office rendering, diff view, terminal as a
  view, snippet rendering, git status display, and the file explorer as a **read-only browser**.
  "Open file in preferred editor" stays: it hands off to an external binary, which is the fork's
  answer to editing. `apps/server` orchestration-v2, `packages/contracts`, and `apps/mobile` are
  untouched.

## Acceptance checklist

- [x] **No editor entry point survives** — `grep -rn "diffs/edit\|EditableFileSurface\|editableFileContents" apps/web/src`
      → no matches, and no `@uiw/react-codemirror` or `CodeEditor` surface exists anywhere in
      `apps/web/src` to fall back to. No save/discard control is reachable in a live client
      (capture below).
- [x] **No write path from the file surface** — `grep -rn "writeFile\|saveFile" apps/web/src/components/files/*.ts*`
      (excluding tests) → no matches. The optimistic atom and its confirm/resolve helpers are gone,
      so nothing can hold an unsaved buffer.
- [x] **The four MCP tools are not advertised** — `vp test run apps/server/src/mcp/McpHttpServer.test.ts`
      asserts the tool list omits watch/unwatch/guides and still carries link/unlink/list;
      `vp test run apps/server/src/mcp/toolkits/pullRequests/handlers.test.ts` passes with the
      watch and guide blocks removed.
- [x] **Model-facing text agrees with the toolkit** — the `<pull_request_linking>` block in
      `packages/provider-core/src/server/runtimeInstructions.ts` no longer names watch or babysitting;
      `vp test run packages/provider-core/src/server/runtimeInstructions.test.ts` → **2 passed**.
      The 8 re-pinned `muse_transcript.ndjson` fixtures play: `vp test run
      apps/server/src/orchestration-v2/testkit` → **206 passed**, and the wider
      `vp test run apps/server/src/orchestration-v2 -t replay` → **193 passed**.
- [x] **The context budget shrank, not grew** — `agentContextBudget.json` now matches measured
      output; the `agent-context-budget` eval fails growth past main, and this lowers every figure.
- [x] **Evals still run** — `vp test run evals/mcp-tool-use/run.test.ts evals/thread-titles` →
      **409 passed** (27 removed cases deleted, the watch/unwatch mocks and the subagent-watch
      guard with them).
- [x] **No migration needed** — no persisted store `kind` was removed: the `file` and `files`
      right-panel surfaces still exist and still rehydrate, they just render read-only. Verified by
      `vp test run apps/web/src/rightPanelStore.test.ts` → **60 passed** (unchanged from PR4b).
- [x] **Full web suite** — `vp test run --project unit --project browser` (apps/web) →
      **4820 passed, 2 failed**. Both failures are the known
      [#12](https://github.com/adhorodyski/botki/issues/12) PDF layout flake, not touched here.
- [x] **Full server suite** — `vp test run` (apps/server) → **5789 passed, 9 failed**, and those
      same 9 fail identically on unmodified `origin/main` at `c0936437c` (confirmed by stashing this
      work and re-running). No new server failure.
- [x] **No dead exports left behind** — `vp run knip:check` → **2/2 successful**.
- [x] **Install reproducible** — `CI=true vp install --ignore-scripts` succeeds with an unchanged
      lockfile.
- [x] `vp run check:changed` green, and the run-report in the PR body

## Replay scenario

`showcase` (free, ACP Replay picker) is the path — this slice touches a rendered surface, and no
paid turn is needed to see it:

```sh
vp run dev
node apps/server/src/bin.ts thread start --base-dir .t3 --provider devReplay --model showcase <project> "show me a file"
```

What to look for, in the right panel once the turn finishes:

1. Open a file from the explorer → it renders with **no save, discard, or dirty-dot affordance**, and
   zero `contenteditable`/`textarea` in the surface.
2. Open `README.md` → markdown still renders, and "Show rendered markdown" still toggles. The
   explorer still browses, searches, and refreshes.
3. The panel still offers Browser, Terminal, Files, Diff, Device, Side chat. Files is the surface
   that changed, not a surface that disappeared.

Cite the Pi path headless rather than through the picker:
`vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`
→ 1 passed, so provider-side history still survives; this slice changes no adapter.

## Reference captures

Captured through the Browser panel against isolated state (a second worktree's own `.t3`, seeded
read-only from the owner's database — never the live one):

- `ACCEPT/captures/1/file-explorer-browses-worktree.png` — the explorer still lists the real tree
  with no editor mounted.
- `ACCEPT/captures/1/source-file-no-save-controls.png` — `package.json` open in the surface:
  syntax-highlighted source, breadcrumb, "Open file in preferred editor", and nothing that writes.

Measured in that live surface, on the opened file: 0 `contenteditable`, 0 `textarea`, and no
`aria-label` matching save/discard/revert. The stronger, non-visual proof is at the import level:
`git show c0936437c:apps/web/src/components/files/FilePreviewPanel.tsx` imports
`@pierre/diffs/edit` (`EditProvider`, `File`, `Virtualizer`) and PR5's version imports none of it —
`grep -rn "diffs/edit" apps/web/src` returns nothing.

## Where this stops

Three `watch_pull_request` mentions remain in
`apps/server/src/orchestration-v2/.../PullRequestWatchReactor.ts` and `pullRequestWatch.ts`. That is
the v2 runtime's own machinery and text, and
[#11](https://github.com/adhorodyski/botki/issues/11) owns cutting it; PR5 removed only what the
harness advertises to a model. The icon-name union members and the `client-runtime` /
`t3ToolSummary` / timeline cases for the four tools stay on purpose — they render **historical**
records of turns that called those tools, and `apps/mobile` reads the same map.

`apps/mobile` is untouched, as is `packages/contracts`.

## Reject criteria

- Fails `vp run check:changed`, or a repo-wide check was run instead of the focused one.
- Reintroduces anything on [the cut list](../AGENTS.md#the-cut-list-fork-rule-never-reintroduce) —
  including a "view-only" editor that can still mark a buffer dirty, or a watch/guide tool renamed
  rather than removed. Half-deletion is the failure mode.
- Deleted a surface that is not the editor: markdown/diff/terminal/preview rendering, the file
  explorer's read-only browsing, or git status display.
- Grew `agentContextBudget.json` past main.
- Bumped a persisted-store version without a migration — none is warranted here, so one appearing
  is a mistake.
- Reuse-first audit has an empty row, or a row claims "no" without the one-line justification.
- Run-report missing, or it lists checks that were not actually run.

## What we reused

| Question                                                 | Answer                                                                                               | Where                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | Yes — tool presentation stays the existing map, entries removed not reimplemented                    | `packages/shared/src/t3McpToolPresentation.ts`            |
| Upstream module (existing service, one method added)     | Yes — the PR toolkit keeps its existing tool/handler shape; 4 tools deleted, 0 added                 | `apps/server/src/mcp/toolkits/pullRequests/`              |
| Existing component (`components/ui`, feature component)  | Yes — an opened file reuses the read-only preview already in the feature rather than a new component | `apps/web/src/components/files/ReadOnlySourcePreview.tsx` |

CUSTOM: none. This slice is subtraction plus one re-point of an existing component.

## Patterns and model files

- Patterns followed: web feature components keep their existing variants and tokens (no restyle, no
  new `className` look); MCP tools keep the toolkit's `Tool.make` + handler shape; contracts and
  RPC untouched.
- Files deleted: `fileSaveSessions.ts`, `fileSaveCoordinator.ts`, `fileEditorDismissal.ts`,
  `fileCommentAnnotations.ts`, plus their `.test.ts` / `.browser.test.tsx` files,
  `fileEditorVirtualization.test.ts`, and `projectFilesQueryState.test.ts` (the save-flow half of
  that module's coverage; the surviving `projectFilesQueryState.test.tsx` covers what remains).
- Files added: none in source — only this ACCEPT and `ACCEPT/captures/1/`.
- Files materially rewritten: `apps/web/src/components/files/FilePreviewPanel.tsx` (−443 lines),
  `apps/web/src/components/files/projectFilesQueryState.ts` (−127),
  `apps/server/src/mcp/toolkits/pullRequests/handlers.ts` (−246),
  `apps/server/src/mcp/toolkits/pullRequests/tools.ts` (−154).

## Known environment note

In an isolated worktree the explorer renders populated (see the capture), but its threads point at
worktree paths that do not exist in that sandbox, so a thread's own checkout may list nothing until
you pick a project that exists here. This behaves identically on `c0936437c`, so it is not a PR5
regression — and note the tree renders inside a shadow root, so a DOM probe must pierce it.

## Run report

Lives in the PR body; recorded here for the owner's convenience.

```
Ran:    vp run check:changed; vp test run --project unit --project browser (apps/web); vp test run (apps/server);
        vp run knip:check; CI=true vp install --ignore-scripts; vp test run evals/mcp-tool-use/run.test.ts
        evals/thread-titles; vp test run apps/server/src/orchestration-v2/testkit;
        vp test run packages/provider-core/src/server/runtimeInstructions.test.ts;
        vp test run apps/web/src/rightPanelStore.test.ts;
        vp test run .../PiReplayFixtures.integration.test.ts -t pi_chat_demo;
        integrated pass: vp run dev in a second worktree on seeded read-only state, showcase replay,
        files opened through the Browser panel, and the same flow re-run on c0936437c.
Passed: check:changed all green (format, lint, knip 2/2, graphql, typecheck 31 packages, tests, react compiler).
        Web 4820 pass / 2 fail (known #12 PDF flake). Server 5789 pass / 9 fail — identical 9 on baseline main.
        Evals 409 pass. Testkit 206 pass. rightPanelStore 60 pass. runtimeInstructions 2 pass.
        knip 2/2. Install clean, lockfile unchanged.
        Live surface: 0 contenteditable, 0 textarea, 0 save/discard controls.
Untouched: apps/mobile, packages/contracts, orchestration-v2 runtime (incl. PullRequestWatchReactor — #11),
        packages/source-control-*, markdown/diff/terminal/preview rendering, "Open file in preferred editor",
        historical tool-presentation cases for
        old records, docs/user/* except the source-control watch section.
```
