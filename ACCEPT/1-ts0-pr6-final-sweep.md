# ACCEPT/1-ts0-pr6-final-sweep

TS0 PR6 — the final sweep. Notices and attribution, the README, the residue of PR2–PR5 in
runnable code and docs, the dead-code final pass, and a clean-state boot check. Written from
[template.md](template.md) against [adhorodyski/botki#1](https://github.com/adhorodyski/botki/issues/1)
(last PR of the plan in that issue: "PR6 NOTICE + README + final sweep").

## What this slice is

Five things, none of them a feature:

- **`NOTICE`** (new) — t3code MIT attribution with the upstream repo named, and OpenBot
  `<=0.1.11` Apache-2.0 attribution for the referenced design ideas. `LICENSE` is untouched MIT.
- **`README.md`** — rewritten in the Botki product voice. Two sentences on what it is, one line on
  what survived plus attribution, clean-clone quickstart, EN only. Every `t3.codes`/`t3.gg`
  marketing sentence is gone.
- **Residue sweep** — the removed surface's fingerprints deleted from runnable code, and the docs
  that described it rewritten to what the fork does now.
- **Dead-code final pass** — `vp run knip:check`, both passes. **Result: nothing to delete.** See
  the dedicated section below for why that is the answer rather than an unfinished step.
- **Clean-state gate** — fresh clone, install, `vp run dev` boots, server answers on loopback.

## Acceptance checklist

- [x] **`NOTICE` exists, names both upstreams and their licenses** — `head -20 NOTICE`. The
      OpenBot version bound is load-bearing and verified, not copied from the brief: v0.1.11's
      `LICENSE` really is Apache-2.0, but OpenBot **now** ships under PolyForm Noncommercial 1.0.0,
      which is incompatible with this MIT repo. The NOTICE says so in one line, so a future reader
      does not "helpfully" widen the bound.
- [x] **`LICENSE` is untouched MIT** — `git diff origin/main -- LICENSE` is empty. Copyright line
      unchanged (`2026 T3 Tools Inc.`), which is correct: MIT requires the notice survive.
- [x] **No missing third-party notice file** — `node -e` over `third-party-licenses.config.json`
      confirms all 7 `customNotices[].noticeFile` paths exist. The generated-notice system
      (SPDX templates under `third-party-licenses/spdx/`) already covers what ships in a build;
      the NOTICE points at it instead of duplicating it. `vp run licenses:sync` not needed — no
      new license id entered the tree.
- [x] **README states the product and attributes upstream** — no `t3.codes`, no `t3.gg` marketing,
      no app-store links, no "wait what are you selling me". `grep -niE "t3\.codes|app\.t3"
      README.md` → no matches. Upstream is named once with a link, plus `NOTICE`.
- [x] **README quickstart works from a clean clone** — the exact commands in it are the ones the
      clean-state gate below ran. Includes a `--home-dir` warning; see **A footgun the README had to
      document**.
- [x] **No runnable code references removed surface** —
      `grep -rIn -iE "t3\.codes|posthog|ingest\.t3|blacksmith|T3_TASK_CACHE" apps packages scripts
      .github .devcontainer t3.json` (excluding `apps/mobile`) returns only the four deliberate
      survivors listed under **Deliberate survivors**.
- [x] **No `@clerk` outside mobile, no Clerk build plumbing left** — the web/desktop/server vite
      configs no longer define `VITE_CLERK_*` or `__T3CODE_BUILD_CLERK_*`; each deleted define was
      grepped for a reader first and found to have none. Mobile's `@clerk/expo` is TS9's, untouched.
- [x] **No kept doc links a deleted file or a deleted directory** — scripted check over every
      `.md` in `docs/`: **0 broken relative links**. PR4c had left 4 (into
      `PullRequestSyncReactor.ts` and three deleted forge clients); PR1's `assets/README.md`
      `plugin://` and the `t3-context://` pseudo-URLs are not file links.
- [x] **Docs that kept a removed-surface claim now state current behavior** — `remote-access.md`
      (no T3 Connect section; routes are LAN/tailnet/VPN/SSH/reverse-proxy), `faq.md` (the 3/10/100
      machine-limit question and the T3 Chat upsell are deleted, not softened), `install.md` (source
      build; upstream's installer kept and labelled as reference), `welcome-wizard.md`,
      `background-service.md`, `telemetry.md`, `project-settings.md` (the **Hold webhooks while
      offline** feature is gone from the UI, so its doc is gone too), `prompt-links.md`
      (`app.t3.codes` → `<server>`), `observability.md`, and the internals notes.
- [x] **`vp run knip:check` green, both passes, exports included** — `vp run knip:check` → exit 0.
- [x] **`check:changed` green** — all 9 gates pass: format, lint, knip 1/2, knip 2/2, graphql,
      typecheck (36 packages), tests (33 files), react compiler, unused patches.
- [x] **`CI=true vp install --ignore-scripts` reproduces CI's lockfile gate** — prints **"Lockfile
      is up to date"**. This matters here: deleting `@vercel/config` is a dependency cut, and PR3's
      ACCEPT records all 12 CI jobs failing that exact gate. Regenerated the lockfile **after** the
      manifests were final (`-78` lines), then reproduced the frozen install locally.
- [x] **Known flake, noted and not fixed here** — it **did** fail in my runs: `keeps workspace PDF
      scroll and zoom after reloads` in
      `apps/web/src/components/files/AttachmentFilePreview.browser.test.tsx`, which is exactly what
      [adhorodyski/botki#12](https://github.com/adhorodyski/botki/issues/12) covers ("main is red").
      Both the test and the component are byte-identical to `origin/main`; see **The 10 failures are
      not this PR's** for how that was established rather than assumed.
- [x] `vp run check:changed` green, and the run-report in the PR body

## The dead-code pass: why the answer is "nothing"

`knip:check` is green on `origin/main` and green after this PR, including the exports pass. So no
package or file became fully unreachable as a result of PR2–PR5, and there is no knip output to
paste as a deletion justification. Rather than invent deletions to fill the step, three candidates
were checked and each correctly stayed:

| Candidate                                               | Why it stays                                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/source-control-*` (9 packages)                | Still reachable: 25 imports from `apps/server/src/{sourceControl,pullRequest,vcs,git}`. PR4c made the forge surface inert but kept those modules; deleting them is a runtime-logic change, which this slice may not make. |
| `@pierre/trees`                                         | Live: the diff file tree and `FileBrowserPanel` import it. Only the deleted editor's half went.                                                                                                                           |
| `infra/relay`, `infra/task-cache`, `apps/web/vercel.ts` | Already deleted by PR1/PR3; the leftovers under `infra/` are untracked `node_modules` only.                                                                                                                               |

What knip **could not** see, and was deleted by hand because it is genuinely dead:

| Deletion                                                                                                                                     | Justification                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/vercel.ts`, `.vercelignore`, `@vercel/config`                                                                                      | Hosted-web router for `app.t3.codes`. No workflow, no script, no import references it; nothing deploys this fork to Vercel.                                                                                                                       |
| `apps/web/src/legalLinks.ts`                                                                                                                 | Its only export was `https://t3.codes/privacy-policy`, a claim about a policy this fork does not have. Both consumers (Settings → Legal row, welcome-wizard privacy paragraph) were making a false statement about telemetry that PR3 made inert. |
| 7 vite `define`s (`VITE_CLERK_*`, `VITE_RELAY_OTLP_*`, `VITE_T3CODE_RELAY_URL`, `__T3CODE_BUILD_CLERK_*`, `__T3CODE_BUILD_CHANNEL__`)        | Each grepped for a reader; each had zero. They baked upstream's Clerk instance public key into every fork build.                                                                                                                                  |
| `relayClientOtlp*` in `scripts/lib/public-config.ts`                                                                                         | Producer of env vars with no consumer left once the relay went; mobile's `T3CODE_RELAY_URL` and mobile OTLP keys were verified as still read and kept.                                                                                            |
| `@clerk/clerk-js`/`@clerk/react` from web `optimizeDeps.include`, `@pierre/diffs/edit`, the `clerk/BrowserManagedAuthShell.tsx` warmup entry | Named modules that no longer resolve or no longer have an importer.                                                                                                                                                                               |
| `T3_TASK_CACHE_HOST` fallback in `scripts/mobile-native-client.ts`                                                                           | The task-cache infra is gone; the reader path already no-ops without an untracked `.task-cache.json`.                                                                                                                                             |

## A footgun the README had to document

The clean-clone check found this, and it is worth your attention beyond the README:

`resolveWorktreeT3Home` derives a checkout's own `.t3` only when the directory is a **linked git
worktree**. A plain `git clone` is not one, so bare `vp run dev` in a fresh clone resolves state to
`~/.t3` — the owner's real database. My first gate run did exactly that and only failed safe because
a server was already running there:

```
baseDir=/Users/adhorodyski/.t3
ERROR  A T3 Code server is already running for /Users/adhorodyski/.t3 (pid 46455, http://127.0.0.1:13773).
```

AGENTS.md says the worktree `.t3` "deliberately outranks an ambient `T3CODE_HOME`", which is true
but silent about the non-worktree case. I fixed the README to require `--home-dir ./.t3` in a bare
clone rather than ship the unsafe instruction I had first written. **The durable fix is a dev-runner
change** — warn or refuse when a non-worktree checkout resolves state outside itself. That is
runtime behavior, so it is out of this slice's scope; it should be its own issue.

## Replay scenario

Nothing here renders differently, so the free Pi-path fixture is cited rather than re-recorded:

```sh
vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo
```

What it could plausibly break here is the client runtime and the server's layer graph after the
vite defines and `public-config` keys disappeared. It passes (see run report). No new visual to look
for; run `showcase` in the picker if you want to watch a turn stream anyway.

## Clean-state transcript

Fresh clone of `ts0/pr6-final-sweep`, install, `vp run dev`, server on loopback. State was pinned to
the clone (`--home-dir ./.t3 --no-seed`); the clone's own `environmentId` came back as
`167bf0ed-…` while the live install reports `fa9cb9f5-…`, which is the proof the sandbox was
isolated rather than pointed at real data.

```
$ git clone --branch ts0/pr6-final-sweep <repo> /tmp/botki-gate && cd /tmp/botki-gate
$ pnpm install --ignore-scripts
Done in 11.8s

$ node scripts/dev-runner.ts dev --home-dir ./.t3 --no-seed
[dev-runner] mode=dev source=default ports selectedOffset(server=2,web=2) \
             serverPort=13775 webPort=5735 baseDir=/tmp/botki-gate/.t3
  VITE+ v1.4.0  ready in 1395 ms
  ➜  Local:   http://localhost:5735/
INFO Listening on http://127.0.0.1:13775
  pairingUrl: http://localhost:5735/pair#token=…

$ curl -w "%{http_code}\n" -o /dev/null http://localhost:5735/
200   (24,339 bytes)
$ curl -w "%{http_code}\n" -o /dev/null http://localhost:5735/pair
200
$ curl -s http://127.0.0.1:13775/.well-known/t3/environment | head -c 120
{"environmentId":"167bf0ed-2654-482f-8f38-c421eec3a8a0","label":"INV-0323","platform":{"os":"darwin","arch":"arm64",…
$ curl -w "%{http_code}\n" -o /dev/null http://127.0.0.1:13775/api/orchestration/shell
401   (correct: an unauthenticated caller gets nothing)
$ curl -w "%{http_code}\n" -o /dev/null http://localhost:5735/api/orchestration/shell
401   (same route through Vite's proxy: single-origin dev is intact)
```

Note `127.0.0.1:5735` returns `000` while `localhost:5735` works: Vite binds the loopback hostname,
which is the expected dev behavior and the reason the README tells you to open the printed URL.

**Desktop dev on macOS is verified by the owner separately.** This slice does not claim it. No
Electron run is recorded here.

## Deliberate survivors

Things that still say `t3.codes` on purpose. Each would cost something real to change:

- `packages/contracts/src/t3ProjectFile.ts` + root `t3.json` `$schema` — the URL is **live** (it
  serves a real JSON Schema, verified with `curl`, 200/3,881 bytes) and contracts is off-limits in
  this slice. PR1 kept it deliberately for the same reason; `t3.json` is read by editors, so the URL
  has to resolve to the spec's origin.
- `apps/desktop/gnome-extension/{metadata,bundle}.json` — the GNOME extension UUID
  `snap-shot@t3.codes` is an installed-app identifier. Renaming it orphans the extension on every
  existing install.
- `apps/desktop/resources/linux/com.t3tools.t3code.metainfo.xml` — upstream's metainfo `homepage`,
  matching upstream's App ID. Package-name branding is a separate slice.
- `packages/shared/src/{connectAuth,promptLinks.test}.ts` — `DEFAULT_HOSTED_APP_URL` is still read
  by `hostedPairing.ts` and `promptLinks.ts`; changing it changes link-generation behavior, which is
  not residue deletion.
- `apps/server/schema/expo.graphql` — a vendored introspection of api.expo.dev, regenerated by
  `vp run generate` and already in `.macroscope/ignore.md`. Its `PostHog*` types are Expo's schema
  for mobile's EAS integration (TS9), not this fork's telemetry.
- `.macroscope/ignore.md`, `ACCEPT/1-*`, `ACCEPT/3-*` — records of the cuts themselves.

## Reject criteria

- Fails `vp run check:changed`, or a repo-wide check was run instead of the focused one.
- Reintroduces anything on [the cut list](../AGENTS.md#the-cut-list-fork-rule-never-reintroduce).
- **Claims the OpenBot attribution without the `<=0.1.11` bound.** Later releases are PolyForm
  Noncommercial; widening the bound would put an incompatible license claim on this repo.
- **Claims desktop dev works.** The owner verifies that separately.
- A doc rewritten to be _shorter_ rather than _true_ — deleting a working paragraph about pairing,
  routes, or permissions is a regression in the only place a user reads.
- Softening a removed feature into prose instead of deleting it. The 3-machine limit, the T3 Chat
  upsell, and Hold-webhooks are deleted because the features are gone.
- `apps/mobile`, `packages/contracts`, migrations, or `.github/workflows` beyond dead refs.
- Branding renamed in internals (`@t3tools/*` stays).
- Run-report missing, or it lists checks that were not actually run.

## What we reused

| Question                                                 | Answer                                                                                                                                                                                | Where                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | Yes for the doc-anchor contract; nothing new. `T3_CONNECT_TROUBLESHOOTING_SECTIONS` already pins the filename and 9 heading anchors, so I kept them rather than inventing a redirect. | `packages/contracts/src/environmentHttp.ts`                                       |
| Upstream module (existing service, one method added)     | Yes — the existing license-notice generator already covers shipped deps; no service changed and nothing added.                                                                        | `third-party-licenses.config.json`, `scripts/sync-third-party-license-notices.ts` |
| Existing component (`components/ui`, feature component)  | Yes — Settings/Legal and the welcome wizard needed the false claim **removed**; no component restyled, no variant added.                                                              | `apps/web/src/components/settings/SettingsPanels.tsx`                             |

CUSTOM: `NOTICE`. Justification: no mechanism in the repo carried repo-level upstream attribution —
the existing system is per-dependency notices for shipped builds, and `LICENSE` is MIT-only text.

## Patterns and model files

- Patterns followed: server/web changes are deletions only — no service, layer, route, or renderer
  behavior changed; docs follow the AGENTS documentation rule (rewrite the stale claim, do not append
  a new account of it); `Effect.fn` span names and contracts untouched.
- Files added: `NOTICE`, `ACCEPT/1-ts0-pr6-final-sweep.md`
- Files deleted: `apps/web/vercel.ts`, `.vercelignore`, `apps/web/src/legalLinks.ts`
- Files renamed: none
- Model files: `ACCEPT/3-cloud-account-surface.md` for the coupling-audit and lockfile lesson;
  `ACCEPT/1-marketing-task-cache.md` for the `t3.json` schema-URL decision this PR honors.
- Deliberately untouched: `apps/mobile` (39 residue hits, TS9's), `packages/contracts`, migrations,
  `.github/workflows`, `AGENTS.md`, `@t3tools/*` package names, `DEFAULT_HOSTED_APP_URL`, the guest
  CSS tokens and preview `attachGuest` passkeys (live features, not residue), and the whole
  `packages/source-control-*` family.

## Security note worth a reviewer's eye

`packages/shared/src/providerAuthReturnUrl.ts` had `url.origin === "https://app.t3.codes"` in its
**return-URL allowlist** — a live security check accepting a redirect target on a host this fork
cannot serve and does not control. I removed the entry, which fails closed. One desktop test asserted
the hosted path and now asserts the loopback path instead
(`apps/desktop/src/app/CodexAuthCallback.test.ts`); that is the one test in this PR that changed to
match a behavior change, and it deserves the most attention in review.

## Gate results

| Check                                           | Result                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `vp run check:changed`                          | green, all 9 gates                                                   |
| `pnpm-lock.yaml`                                | `-78`, **pure removal, zero added lines** (verified with `git diff`) |
| `CI=true vp install --ignore-scripts`           | **"Lockfile is up to date"**, exit 0                                 |
| `vp run knip:check` (both passes, exports)      | exit 0                                                               |
| `packages/shared`                               | 90 files, **1157 passed**, 3 skipped                                 |
| `packages/contracts`                            | 29 files, **152 passed**                                             |
| `packages/client-runtime`                       | 141 files, **1520 passed**                                           |
| `apps/web` (unit + browser/chromium)            | 443 files, **4820 passed, 1 failed**                                 |
| `apps/server`                                   | 422 files, **5682 passed, 9 failed**, 9 skipped                      |
| `pi_chat_demo` Pi-path fixture                  | **1 passed**                                                         |
| Clean-clone boot (fresh clone → dev → loopback) | passed, transcript above                                             |
| Desktop dev on macOS                            | **not run here** — the owner verifies it separately                  |

### The 10 failures are not this PR's

I did not assume this. I built a baseline worktree at `origin/main` **next to** this one (not in
`/tmp` — AGENTS.md is right that a second checkout belongs beside the repo) and ran the same files.

- **`apps/server` — 7 files, 9 tests.** `diff` of my failing-test names against the baseline's is
  **identical**: 9 for 9, same names. They are machine-environment failures — e.g.
  `invocation.test.ts` asserts `/var/folders/...` while macOS reports its temp dir through the
  `/private/var` symlink. The two files behind the npm-prefix pair are byte-identical to
  `origin/main` (`git diff --quiet origin/main -- .../invocation.{ts,test.ts}` → clean). This box is
  not a clean CI runner; the PR's CI run is the authority on these.
- **`apps/web` — 1 test:** `keeps workspace PDF scroll and zoom after reloads` in
  `AttachmentFilePreview.browser.test.tsx`. That is the known flake: [adhorodyski/botki#12](https://github.com/adhorodyski/botki/issues/12)
  is titled "Fix flaky PDF cases in `AttachmentFilePreview.browser.test.tsx` (**main is red**)". Both
  the test and the component are byte-identical to `origin/main`. Noted, not fixed, per the slice's
  instruction.

## Run report

Lives in the PR body.
