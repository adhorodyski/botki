# Botki

Botki is a self-hosted night agent host: a Node WebSocket server that drives coding agents on a schedule and reports back. A fork of T3 Code, so the server, orchestration, and UI are upstream's; what we build is the nightly loop around it.

We are one owner on one machine, with one provider (Pi). No hosted account, no forge integration, no code editor. Upstream ships an app for people who live in their editor; we ship an app that does the work while they sleep.

## A note from the owner

I like ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.

Channel both "measure twice, cut once" and "yagni". Fight scope creep. Honor the dev's intent in both a minimal and realistic fashion.

This file is navigation, not a legal code. Think "good defaults", not "hard rules". The developer's preferences override anything here.

Night agents work unattended, so this file also carries the rules that keep an unattended run from doing damage: the verification bar, the reuse bar, and the cut list.

## A small glossary

- **you** means the agent reading this file and changing Botki, usually a night agent.
- **I, me, owner, and maintainer** mean Adam. These are who you are talking to now.
- **user** means a person using Botki to direct agents.
- **agent** means a coding agent Botki runs. Depending on context, that may be you.
- **bot** means a configured agent identity: a provider instance, a prompt, a schedule. Bots are the things a night runs.
- **team** means the bots configured for one repo, and which one owns which slice.
- **ask-assign** means handing a slice to a specific bot, by issue, rather than waiting for the routine to pick it up.
- **hand-off** means the point where one bot's green PR becomes another bot's starting state.
- **needs-you** means the queue of work that genuinely needs me, and the only screen I read in the morning.
- **routine** means the nightly schedule: pick a spec'd issue, build, verify, open a PR.
- **provider** means the agent harness Botki talks to. Ours is Pi; others stay in the tree because upstream maintains them, but nothing we ship may depend on them.
- **slice** means one issue-sized unit of work that fits in one night and one PR.
- **spec** means `specs/<issue>-<slug>.md`, a behavior description of one of our own features. See [specs/README.md](specs/README.md).

## The cut list (fork rule: never reintroduce)

TS0 (#1) removes the areas below. They are to be gone, not disabled: dead code misleads a
night agent, and upstream fixes there are never cherry-picked. **TS0 has not merged yet**, so
several of these paths still exist on `main`. Read that as pending work, not permission: do
not build on them, do not add imports of them, and never restore one to make a build pass.

- **Account auth**: Clerk and T3 Connect, `apps/web/src/cloud/`, `apps/server/src/cloud/`, `infra/relay/`, desktop Clerk token stores. Login is to a server address on loopback.
- **Guest shares**: `apps/server/src/guest/`, hosted empty states.
- **Telemetry out**: the PostHog/ingest path. Local `observability/` (file logs, event-loop monitor) stays.
- **Forge and PR surface**: `packages/source-control-*`, `apps/server/src/{vcs,pullRequest,triage,sourceControl}/`, worktree fan-out, settlement, branch naming.
- **Editor**: the VS-style file editor and file explorer with save. Stays: snippets, markdown, diff view, terminal as a view, preview and Design Mode.
- **Provider coding extras**: `watch_pull_request` and PR-review modes. Stays: `create_threads`, `delegate_task`, `schedule_task`, `task_status`, environment tools.
- **Apps and workflows**: `apps/marketing/`, `infra/task-cache/`, and every release, EAS, relay, and signing workflow.

Until TS0 lands, expect the tree to disagree with this list. If a cut area blocks you, stop and open a draft PR with the blocker; do not fix it by reaching into a cut path. If a rule here fights the task in front of you, say so loudly and get a human sign-off before breaking it.

## Reuse first

New code is the last option, not the first. Before writing any, answer these three in the spec or PR:

1. **Core primitive.** Does `packages/contracts`, `packages/shared`, or `packages/client-runtime` already carry this concept?
2. **Upstream module.** Does an existing server service do this, or need one method added?
3. **Existing component.** Does something in `apps/web/src/components/ui` or a feature component already render this?

Custom code is allowed only after all three fail, with a one-line justification. Fill the reuse-first audit table in the issue template or the PR, one row per question. `.repos/` holds vendored upstream references: prefer their patterns over invented ones.

## Patterns

New code matches the idioms around it, per surface:

- **Server** (`apps/server/src`): `Context.Service` + `Layer`, Effect-heavy. Read [Effect services](docs/internals/effect-services.md) before adding server code, and `.repos/effect-smol/LLMS.md` for the library itself. Reusable Effect functions use `Effect.fn("Service.operation")` with a stable span name, not a function wrapping `Effect.gen`. Keep `Effect.gen` for inline programs and layer construction. Use `Effect.fnUntraced` only where spans would be too frequent (stream chunks, per-event projection, tight loops) or would duplicate an existing tracing boundary, and say so nearby. Preserve existing span names and options; pass combinators as additional function-builder arguments.
- **Contracts** (`packages/contracts`): Effect `Schema` structs, the single source for anything crossing the wire. Change the schema and server, web, and mobile all follow. No heavy runtime logic here.
- **Web** (`apps/web`): components in `components/ui` own their look. Pick a `variant` or `size`; do not restyle one with `className` (`shadcn/no-restyle`). If none fits and the look is a generic concept, add a variant; a look belonging to one feature stays in that feature's component. Layout classes (width, flex, margin, position) belong on the parent. Use design tokens, not fixed colors. See [Web UI](docs/internals/web-ui.md).
- **Naming and layout**: match the neighbors. PascalCase service files exporting a namespace, colocated `.test.ts` beside the module, `.browser.test.tsx` for web render tests, subpath exports in `packages/shared` with no barrel.
- **Model files**: list every file a change adds or renames in the PR, so review can tell a new abstraction from a new call site.
- **Inferred types over annotations. `any` is the enemy.**
- **Default to no comment.** Write one only for a constraint, an external quirk, or an invariant the code can't show, in one line where you can and four at most. Don't restate names or signatures, narrate steps, or record history; the PR carries that. `t3code/no-low-value-comments` enforces the cap.
- **React effects are for synchronizing with something outside React.** Derive in render and act in handlers instead of syncing state, but don't hide real lifecycle work in refs or stores to dodge one. `t3code/no-unreasoned-state-sync` reports every effect; one that stays states its reason with `// oxlint-disable-next-line t3code/no-unreasoned-state-sync -- <why>`.
- **Complexity belongs at the adapter boundary.** Orchestration stays pure, UI stays dumb. Server features are services; transports stay thin. A `ws.ts` RPC handler, HTTP route, or MCP tool decodes input, calls one service method, maps errors.
- **Client mutations** use `createEnvironmentRpcCommand`. Add protected methods to `CLIENT_GUARDED_RPC_SCOPES` in contracts and use the command's `permissionAtom` for UI availability. Grants are checked at execution against the destination environment; the server stays authoritative. Keep raw RPC clients inside `rpc/`, and extend the permission behavior tests when adding a protected method.
- **Performance is the product.** No continuously repainting animations; they peg the GPU on high-refresh displays. Watch data sent over websockets, css animations, and lists that are hard to render.

## Night runs

- One issue is one PR, and a PR per task. Do not batch slices.
- Commit prefix: `night(<slice>): ...`, e.g. `night(TS1b): add the Add bot spec`.
- **Never force-push.** A night agent pushes commits and never rewrites shared history.
- Every PR body ends with a run-report: **what you ran** (exact commands), **what passed** (counts, not vibes), **what you did not touch** (the files you deliberately left alone).
- A feature we add over t3code ships or updates its `specs/` file in the same PR; cut PRs, bugfixes, and infra touch nothing there.
- Merge-readiness is proved in the PR body's Requirements status section, never a committed file. Captures are uploaded to GitHub, never committed.
- If you cannot finish a slice, open a draft PR with the run-report anyway, and put the blocker in needs-you. A silent no-show is the worst outcome.
- Update the tracking issue when work lands. Do not leave a second checklist in the repo.

## Dev servers

- `vp i` installs. A worktree gets this from the t3.json setup script; if module resolution looks broken, it probably did not run.
- Setup runs in the background. While `.t3/setup-running` names a live PID, wait for it and do not run `vp i`. It ends with `.t3/setup-done` or `.t3/setup-failed` (with the error tail). With no marker at all, setup never ran here, so run `vp i` yourself.
- `vp run dev` starts server and web. State defaults to that worktree's gitignored `.t3`, which deliberately outranks an ambient `T3CODE_HOME` so you cannot land on shared state by accident. An explicit `--home-dir` still wins.
- Ports derive from the worktree path and are stable across restarts, but read the real ones from the `[dev-runner]` line since occupied ports shift. Loopback is the normal path; `--share` is for a second machine and prints a `pairingUrl:` you hand over whole.
- Stop what you started, by the PID you tracked. See rule 1 below.
- Need a second checkout? `git worktree add` it next to this worktree, not in `/tmp`. Remove it when done.

## The three ways to hurt yourself

1. **Killing by pattern.** Never `pkill -f`, `pgrep | kill`, or `kill` a PID you found by matching a name, path, or worktree string. Your own agent process has this worktree's path in its argv, and this machine runs several other dev servers at once. Kill only a PID you captured at spawn, or the owner of your port from `ss -H -ltnp` after confirming `/proc/<pid>/cwd` is your worktree.
2. **Writing to the live install.** `~/.t3/userdata` is the owner's real Botki database, and it is what the nightly routine runs against. Reading it and copying from it are fine, and a good way to get real test data (see Test data). Never start a server against it, never open it read-write, never clean it up.
3. **Baking in origins.** Never set `VITE_HTTP_URL` or `VITE_WS_URL` for dev. Dev is single-origin and Vite proxies `/api`, `/ws`, `/oauth`, and `/.well-known`. Setting them bakes localhost into the bundle and silently breaks every remote browser.

## Test data

An empty database is a bad test. Seed your worktree's `.t3` with a copy of real data instead of pointing at live state:

- The first `vp run dev` in a worktree does this for you when its database is missing and the source is at most 500 MiB. Larger sources warn and dev starts with an empty database. `--no-seed` or `T3CODE_DEV_SEED=0` skips seeding.
- Run `vp run migrate-dev-db` with your dev server stopped to refresh. It rebuilds `<worktree>/.t3/userdata/statev2.sqlite` from a read-only snapshot of the owner's real data. It keeps recent projects and their stopped threads, and drops scheduled tasks, pending work, auth sessions, and links to other environments, so your dev server never runs the owner's routines or reaches their other machines.
- Refresh `statev2.sqlite`, not `state.sqlite`. The server copies the V1 file only when the V2 file is missing.
- Bring `secrets` and `settings.json` only if the flow under test needs them.
- Copy in, never symlink. Data flows one way: into your sandbox, never back out.

## Verifying

- Before you push, run `vp run check:changed`. It runs CI's fast checks for changed files: format, lint, knip, typecheck of affected packages and dependents, tests beside changes, and the cross-file checks those miss. CI still runs the full suites.
- While you iterate, run `vp test run <files>`. For big files, add `-t "<name>"`.
- Use `vp run typecheck`, not `npx tsc`; it caches per package.
- Run `node -e` snippets from `apps/server` or the owning package. `effect` does not resolve from the repo root.
- **Do not run repo-wide checks.** No `vp check`, no `vp run -r test`, no `vp run -r typecheck` unless I ask. CI owns the full suite.
- Test behavior that can break: orchestration and event-sourcing, provider protocol translation, auth and permission guards, persistence and migrations, external-format parsing, race fixes, and the logic a bug fix changed. Leave out tests for what types already guarantee, trivial logic, copy text, smoke runs, mock-call mirrors, callback wiring, and props rendered to static markup.
- Extend before you add: when an existing test or table covers the behavior, add a row there. Test at one layer: the lowest one that fails on `main`.
- Backend behavior changes ship with focused tests for that behavior. Logic, data, state, and protocol bugs get a failing test first, then the fix. Purely visual bugs get before/after captures as their proof and no test; do not add UI tests for nitpicks.
- The server is event-sourced, and side effects run after the command commits. In tests, drain the effect worker (`OrchestrationEffectWorkerV2.drain`) or await the specific persisted event or `Deferred` that marks the milestone. Never wait on sleeps or polling. A test that needs a timeout to pass is wrong.
  - `it.effect` runs on a `TestClock`; `Effect.sleep` only advances through `TestClock.adjust`. `it.live` is wall-clock and only for subprocess or network fixtures.
  - No `yieldNow` or `sleep` polling loops. Await the `Deferred`, take from the `Queue`, or drain the worker.
  - No per-test timeout argument or `retry`. Flaky tests are fixed, not retried.
  - No `performance.now()` or `Date.now()` deltas. Assert on events and counts, not elapsed time.
  - Browser tests assert through `expect.element` or `vi.waitFor`, never `requestAnimationFrame` or `transitionend`.
  - `vi.mock` factories must not spread a real module that pulls in Shiki or the diff workers.
  - `it.skip` and friends need a tracking issue on the line above: `// quarantine: #1234 <why>`.
  - Lint enforces this: `t3code/no-test-timeout-or-unreasoned-skip`, `t3code/no-frame-waits-in-browser-tests`, `t3code/no-wall-clock-in-tests`, `t3code/no-real-time-wait-in-tests`, `t3code/no-polling-loop-in-tests`.
- Web browser tests render with `await using screen = await render(...)` from `apps/web/test/render.tsx`; `t3code/require-disposable-render` errors on the old patterns. Acquire what the test drives after mounting so it disposes before the unmount. `rerender` needs a fresh element on every call. No lifecycle hooks and no module-level mutable state. `router` is on by default; pass `router: false` only with a one-line comment saying why.
- User-visible changes get one integrated pass in a real client with the [test-botki-app](.agents/skills/test-botki-app/SKILL.md) skill. The primary agent does this once after integrating. Subagents do not launch their own dev servers.

## Replay: never pay to see a turn

Real agent turns cost money, so verify UI work against a recording instead. `vp run dev` registers the free `Replay (dev)` provider, which plays recorded turns with simulated streaming through the real adapter and orchestration. Its models are scenarios; `showcase` covers thinking, a plan, tool calls, an approval, and markdown. Press `Ctrl+Alt+Shift+R` for the picker, call `window.t3dev.replay("showcase")` with `preview_evaluate`, or run `node apps/server/src/bin.ts thread start --base-dir .t3 --provider devReplay --model showcase <project> "go"`. That provider plays ACP transcripts, so its scenario list is the `registry_transcript.ndjson` files plus `showcase`.

Pi is the reference provider, and the chat demo is recorded on it. The `pi_chat_demo` fixture is a real two-turn Pi RPC transcript at `apps/server/src/orchestration-v2/testkit/fixtures/pi_chat_demo/pi_transcript.ndjson`, pinned by `PiReplayFixtures.integration.test.ts`: the second turn must repeat a marker only the first turn's prompt established, so the replay fails if the adapter ever stops carrying provider-side history. Verify it with `vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`, not through the picker (it is a Pi RPC transcript, not an ACP one). Re-record after a Pi upgrade with `vp run record:pi-replay --scenario pi_chat_demo` from `apps/server`, which needs the `pi` binary and its credentials; `--out` writes elsewhere so you can diff before overwriting.

Use a real provider turn only when the change depends on that provider's behavior, and then Pi's cheapest model.

## Evals

`evals/` checks how real models behave with Botki's model-facing text: agent instructions, MCP tool descriptions and schemas, and generated titles. Before you change that text, read [evals/README.md](evals/README.md) and run the evals it names. When you fix a model behavior bug, add a case that fails before the fix.

The `agent-context-budget` workflow fails a PR that grows `apps/server/src/provider/agentContextBudget.json` past main's, and only the `agent-context-increase` label accepts growth. That file measures the harness text we inject (Claude's system append, Codex's additional context, the MCP tool list), not this file: nothing measures `AGENTS.md` in CI, so the 300-line cap below is a review bar, and Pi reads this file as a context file, so every line costs real tokens on every turn. Cut, do not append.

## Documentation

Most code changes do not need a documentation change. Agents can read the code.

- `docs/internals/` is for architectural decisions and their reasons, constraints that span components, and traps that are hard to discover from the source. Before adding a paragraph, ask what a maintainer would get wrong without it. If reading the relevant code answers the question, leave it out.
- Do not document every feature, enumerate fields or methods, narrate control flow, maintain file catalogs, or append PR summaries. Types, tests, and code already record the implementation.
- A local reason the code can't show goes in a short nearby comment. Link to the relevant source instead of copying it.
- When a documented decision changes, rewrite or remove the affected text. Do not append another account of the new behavior.
- `docs/user/` helps people accomplish tasks; `docs/operations/` holds maintainer setup, release, and debugging procedures.

## Plans and work artifacts

- Do not commit implementation plans, research notes, or agent scratch files. Keep temporary working material outside the worktree. `.plans/` is gitignored only as a safety net.
- Track active work in the GitHub issue that owns it.

## How it works

Clients send typed WebSocket requests. The server turns them into _commands_. The _orchestrator_ (`apps/server/src/orchestration-v2/Orchestrator.ts`) serializes commands and decides _events_ without doing any I/O. The _event sink_ commits those events, the _projections_ the UI reads, the _command receipt_, and _outbox_ effects in one transaction. The _effect worker_ then runs the effects, such as starting a provider turn or capturing a checkpoint, and feeds results back as commands. Provider CLIs run as subprocesses; per-provider _adapters_ translate their native protocols into orchestration events. Each turn ends with a _checkpoint_, a hidden git ref, so the app can diff and restore.

Architecture and its constraints: `docs/internals/overview.md`. Glossary: `docs/internals/glossary.md`. Provider adapters: `docs/internals/adding-a-provider.md`.

## Where code lives

- `apps/server` - WebSocket, orchestration, providers, checkpointing, scheduled tasks, MCP. Where most night work lands.
- `apps/web` - React/Vite UI. `apps/desktop` wraps it; `apps/mobile` is React Native.
- `packages/contracts` - Effect/Schema contracts plus small derived helpers.
- `packages/shared` - shared runtime utils, subpath exports, no barrel.
- `packages/client-runtime` - client code shared by web and mobile.
- `packages/provider-pi` - our provider's adapter and RPC client.
- `.repos/` - vendored read-only references (`effect-smol`, `alchemy-effect`). Prefer their patterns over invented ones. Never edit or import from them. Sync with `vpr sync:repos` when bumping the matching dependency. If it is missing (sparse checkout), read a file with `git show origin/main:.repos/<path>`.
