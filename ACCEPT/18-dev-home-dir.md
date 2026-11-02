# ACCEPT/18-dev-home-dir

[adhorodyski/botki#18](https://github.com/adhorodyski/botki/issues/18) — a plain `git clone` is not
a linked worktree, so bare `vp run dev` there resolved state to `~/.t3`: the owner's real database.
PR6 documented a `--home-dir ./.t3` workaround. This is the runtime fix, plus the README change that
workaround existed to cover.

## What this slice is

One rule, stated once: **a checkout keeps its dev state inside itself.**

- `resolveCheckoutT3Home` (new, `packages/shared/src/devHome.ts`) walks up to the nearest `.git`
  marker — file **or** directory — and answers `<root>/.t3`. The existing
  `resolveWorktreeT3Home` keeps answering only for a _linked_ worktree, which is what port hashing
  and the pair guard depend on. The upward walk is now shared by both (`findGitMarkerDirectory`);
  only the linked-worktree test differs.
- `scripts/dev-runner.ts` uses it as the **last** default:
  `--home-dir` → worktree `.t3` → ambient `T3CODE_HOME` → checkout `.t3`. A worktree's `.t3` still
  outranks `T3CODE_HOME` exactly as before. The clone default sits below the env var because the
  issue names both as explicit selections, and outside a worktree `T3CODE_HOME` is a deliberate
  choice rather than an accident of a shared shell. Nothing that already chose a home changed.
- The clone branch prints `using this checkout's state at <path> — pass --home-dir to choose
  another.` alongside the existing `[dev-runner]` line, so the choice is never silent. A worktree
  prints nothing new.
- First-start seeding now keys off the resolved home rather than `worktreeHome`, so a fresh clone
  seeds its own empty database from `~/.t3` the way a worktree already did — that is what makes the
  bare clone usable rather than merely safe.
- **Two follow-on call sites**, both found by grepping the other users of `resolveWorktreeT3Home`,
  each of which would otherwise have been wrong for the new default:
  - `apps/server/scripts/migrate-dev-db.ts` — the README tells a fresh-clone user to run this, and
    it refused outside a linked worktree. It now targets the checkout's `.t3`; the error retagged
    `MigrateDevDbNotInCheckoutError` and its text says "git checkout". The `--home-dir` workaround's
    own sibling.
  - `apps/server/src/cli/pair.ts` — pairing walked only shared-home-or-worktree, so `t3 pair` from
    a clone would have hunted in `~/.t3` for a server that now lives in `./.t3`. Outside a linked
    worktree it tries both candidates; `discoverPairTarget` only ever mints into a base with a
    **live** server, so nothing is written to a home that has no running server. The linked-worktree
    no-fallback rule (#10516) is untouched — that branch still pushes one base and nothing else.
- Docs: README quickstart drops `--home-dir ./.t3` from both snippets and swaps the warning for the
  one-line rule; `docs/operations/development.md`, `docs/operations/observability.md`, and the
  AGENTS.md dev-servers bullet now say "checkout" where they said "linked worktree".

## Acceptance checklist

From the issue, three items:

- [x] **Dev-home resolution in a plain clone defaults to the checkout's `.t3`, never `~/.t3`** —
      `vp test run scripts/dev-runner.test.ts -t "plain clone"` → 4 tests, and
      `-t "t3 home precedence"` → 13. `defaults a plain clone to its own .t3 rather than the shared
      home` asserts the spawned `T3CODE_HOME` is `<clone>/.t3` when nothing selected a home; `says which checkout state dir it chose` asserts
      the printed path; `seeds a plain clone's empty database` asserts `migrate-dev-db --base-dir
      <clone>/.t3` runs; the last two pin the precedence the fix did _not_ change (`--home-dir`
      still wins, ambient `T3CODE_HOME` still beats the clone default). All three of the clone
      behaviors fail on `main` — see **Failing first**.
- [x] **README quickstart updated** — the workaround is gone from both snippets:
      `grep -n "run dev\|dev:desktop" README.md` shows `vp run dev` and `pnpm dev:desktop` with no
      `--home-dir`. The only remaining mention is the sentence offering it to choose another home.
      The paragraph that justified the workaround is replaced by the rule it implies.
- [x] **No behavior change for worktree-based flows** — the four pre-existing precedence tests in
      `scripts/dev-runner.test.ts` (`prefers an explicit --home-dir over the worktree default`,
      `treats a blank --home-dir as unset`, `prefers the worktree .t3 over an ambient T3CODE_HOME`,
      `falls back to an ambient T3CODE_HOME outside a worktree`) pass unchanged, as do the three
      seeding tests and the #10516 pair regression. `resolveGitWorktreePath`, and therefore port
      hashing, is byte-for-byte the same answer.

Always last:

- [x] `vp run check:changed` green, and the run-report in the PR body.

## Failing first

The behavior is logic, so it gets failing tests rather than captures. Each new test was run against
`origin/main`'s `scripts/dev-runner.ts` / `apps/server/src/cli/pair.ts` with the rest of the tree
kept, then re-run with the fix:

```
FAIL defaults a plain clone to its own .t3 rather than the shared home
  AssertionError: expected undefined to equal '/var/folders/.../t3-devrunner-bdqUv9/.t3'
FAIL says which checkout state dir it chose for a plain clone
  AssertionError: expected '[dev-runner] mode=dev:server source=d…' to include
                   'using this checkout's state at /var/…'
FAIL seeds a plain clone's empty database the way it seeds a worktree's
  AssertionError: expected [] to be a superset of [ '--base-dir', …(1) ]
FAIL pair > pairs with a server whose state lives in the plain clone's own .t3
  NoRunningServerError: No running T3 Code server found.
```

`undefined` in the first one is the bug: with no `T3CODE_HOME` the dev runner set nothing, so the
child inherited the shared home.

## Replay scenario

Nothing rendered changes — the diff is a script, a shared resolver, and prose — so no scenario is
named. The nearest thing to a visible surface is the printed line, and it is in the transcript
below. The Pi-path fixture is cited for the pair change, since it is the one file here the server
boots:

```sh
vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo
```

## Reference captures

Server-side; the runtime transcripts stand in for images. `--dry-run` already existed and resolves
and prints without spawning anything, which is the inert way to show the choice. This repo root is
itself a **plain clone** (`git rev-parse --git-dir` → `.git`), the exact layout #18 is about; each
run below swapped only `scripts/dev-runner.ts` between `main` and this branch, with `T3CODE_HOME`
unset.

**Plain clone — before, then after:**

```sh
$ node scripts/dev-runner.ts dev --dry-run        # main's dev-runner.ts
[dev-runner] mode=dev source=default ports selectedOffset(server=2,web=2) \
             serverPort=13775 webPort=5735 baseDir=/Users/adhorodyski/.t3     ← the real database

$ node scripts/dev-runner.ts dev --dry-run        # this branch
[dev-runner] using this checkout's state at /Users/adhorodyski/Developer/botki/.t3 \
             — pass --home-dir to choose another.
[dev-runner] mode=dev source=default ports selectedOffset(server=2,web=2) \
             serverPort=13775 webPort=5735 baseDir=/Users/adhorodyski/Developer/botki/.t3
```

**Linked worktree — unchanged**, which is what night agents depend on. Run from a throwaway
`git worktree add` with the same cwd (removed afterwards), once per runner:

```
main's runner   baseDir=/Users/adhorodyski/Developer/botki-18wt/.t3  source=worktree  ports 16612/8572
this branch     baseDir=/Users/adhorodyski/Developer/botki-18wt/.t3  source=worktree  ports 16612/8572
```

Identical including the port hash, and no new line printed there.

**The remaining paths, live**, to show nothing that already chose a home moved:

| cwd              | env                             | chosen                                               |
| ---------------- | ------------------------------- | ---------------------------------------------------- |
| linked worktree  | `T3CODE_HOME=/tmp/ambient-home` | `<worktree>/.t3` — still outranks it, no notice      |
| plain clone      | `T3CODE_HOME=/tmp/ambient-home` | `/tmp/ambient-home` — an explicit choice wins        |
| outside any repo | —                               | `/Users/adhorodyski/.t3` — a real install, unchanged |

## Reject criteria

- Fails `vp run check:changed`, or a repo-wide check was run instead of the focused one.
- Reintroduces anything on [the cut list](../AGENTS.md#the-cut-list-fork-rule-never-reintroduce).
- **A linked worktree resolves differently than before.** Night agents run in them and their whole
  isolated-database story rests on that answer.
- **`T3CODE_HOME` stops working for anyone who set it on purpose**, or the worktree `.t3` stops
  outranking it.
- `t3 pair` mints a token into a database with no live server, or gains a fallback in the linked-
  worktree branch (#10516).
- Reuse-first audit has an empty row, or a row claims "no" without the one-line justification.
- Run-report missing, or it lists checks that were not actually run.

## What we reused

| Question                                                 | Answer | Where                                                                                                                                                                                            |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core primitive (`contracts`, `shared`, `client-runtime`) | yes    | `packages/shared/src/devHome.ts` — one new export on the module that already owns this decision, sharing its upward walk with the existing worktree resolver rather than a second implementation |
| Upstream module (existing service, one method added)     | yes    | `scripts/dev-runner.ts` resolution block extended in place; `prepareFirstStart` and `discoverPairTarget` reached by parameter, not by new machinery                                              |
| Existing component (`components/ui`, feature component)  | n/a    | No UI. The existing `[dev-runner]` log line carries the announcement                                                                                                                             |

CUSTOM: `resolveCheckoutT3Home`, because the existing resolver deliberately answers only for linked
worktrees and widening _it_ would change port hashing and the #10516 pair guard.

## Patterns and model files

- Patterns followed: Effect `Effect.fn("Service.operation")` with stable span names in the shared
  resolver; `Effect.gen` kept for the CLI/dev-runner programs; errors as `Schema.TaggedError` with a
  `message` getter (the retagged migrate error); inferred types over annotations.
- Files added: `ACCEPT/18-dev-home-dir.md`.
- Files renamed: none. `MigrateDevDbNotInWorktreeError` → `MigrateDevDbNotInCheckoutError` is a
  symbol rename inside `apps/server/scripts/migrate-dev-db.ts`, with no other references in the tree.
- Files changed: `packages/shared/src/devHome.ts`, `packages/shared/src/devHome.test.ts`,
  `scripts/dev-runner.ts`, `scripts/dev-runner.test.ts`, `apps/server/scripts/migrate-dev-db.ts`,
  `apps/server/src/cli/pair.ts`, `apps/server/src/cli/pair.test.ts`, `README.md`,
  `docs/operations/development.md`, `docs/operations/observability.md`, `AGENTS.md`.

## Deliberately left alone

- `resolveGitWorktreePath` and its four tests — port hashing reads the same answer.
- `DEFAULT_T3_HOME` and `resolveBaseDir` — the shared home is still correct for a real install and
  for `pair`/`serve` outside a checkout.
- `apps/server/src/cli/thread.ts` and every other `--base-dir` consumer — they take an explicit
  directory and have no checkout default to get wrong.
- `.repos/*` have no `.git`, so the new upward walk cannot resolve state into a vendored reference.
