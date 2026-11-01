# ACCEPT/1-marketing-task-cache

TS0 PR2 — the marketing site and the shared maintainer task cache are gone from the fork.
Written from [template.md](template.md) before the code, per the contract.

Issue: [adhorodyski/botki#1](https://github.com/adhorodyski/botki/issues/1) (PR 2 of the plan in
that issue: "PR2 marketing + infra/task-cache (isolated apps, low coupling)").

## What this slice is

Two deletions and nothing else:

- `apps/marketing/` — the Astro site that publishes t3's pages, legal docs, and the
  `t3.json` JSON Schema at `t3.codes`. A self-hosted product has no site to publish and
  no `t3.codes` to publish it on.
- `infra/task-cache/` — the Cloudflare Worker that is t3's private maintainer build cache.
  Its endpoint (`.task-cache.json`), its credentials (`~/.config/t3-task-cache/`), and its
  CI reader token (`T3_TASK_CACHE_READ_TOKEN`) are t3's own infrastructure.

Everything else stays. This PR deletes no runtime feature and no rendered surface.

## Acceptance checklist

- [x] `apps/marketing/` and `infra/task-cache/` do not exist — `test ! -e apps/marketing && test ! -e infra/task-cache && echo gone` → **gone**
- [x] No workspace still names them — `grep -rn "@t3tools/marketing\|@t3tools/task-cache" --include=package.json --include=*.yaml --include=*.jsonc . | grep -v node_modules` → **no matches** (`pnpm-workspace.yaml` keeps `apps/*` and `infra/*` globs; `infra/relay/` still lives under the second, so neither line is removed)
- [x] No task-graph reference — `grep -rn "marketing\|task-cache\|remoteCache" vite.config.ts package.json knip.jsonc` → **no matches** (root `run.cache` is now `{ scripts: false }`, i.e. the local cache only)
- [x] No CI reference — `grep -rn "task-cache\|TASK_CACHE" .github` → **no matches**; the token-gated "Enable shared task cache" step and the `task-cache-read-token` input are gone, so no job asks for a secret this fork does not have
- [x] No docs link — `grep -rn "infra/task-cache" --include=*.md .` → **no matches**; `apps/mobile/README.md` no longer tells you to run `bash infra/task-cache/install.sh`
- [x] Nothing left unreachable — `vp run knip:check` → **both commands exit 0**
- [x] `packages/shared` keeps only what is still imported — `buildT3ProjectFileJsonSchema` was reached only by the deleted schema route, so it is gone; `T3_PROJECT_FILE_SCHEMA_URL` stays as the literal the `t3.json` `$schema` description still carries, now module-local
- [x] No hidden coupling forced a rescue — see "Coupling audit" below; `apps/web`, `apps/server`, `apps/desktop`, and `apps/mobile` never imported either target
- [x] `pnpm-lock.yaml` regenerated for 38 workspace projects (was 40) — `pnpm install --lockfile-only` → **Done**, 1435 lines dropped
- [x] `vp run check:changed` green, and the run-report in the PR body

## Replay scenario

None. Nothing rendered changes: no component, route, service, or protocol is touched, so
there is no turn to replay and no surface to look at. The proof for this slice is the pair
of gate commands plus the absence checks above.

## Reference captures

None — a deletion with no visible surface. What stands in for a capture is the transcript of
the two gates, in the PR body's run report, and the `grep` results above showing no reference
survives.

## Coupling audit

The assignment said to stop and report if `apps/marketing/` were reachable from web/server
runtime code. It is not. What the audit found, and what each find cost:

| Surface                                                                                     | Finding                                                                                         | Action                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vite.config.ts`                                                                            | `import { remoteCacheUrl } from "./infra/task-cache/src/remoteCache.ts"` fed `run.cache.remote` | Root cache config becomes `{ scripts: false }`; the local cache is unchanged, so `vp run` caching behavior for every package is identical                                                                                                                                                                          |
| `package.json`                                                                              | `dev:marketing`, `start:marketing`, `build:marketing`                                           | Removed; `build` filters `./apps/*`, which now matches four apps instead of five                                                                                                                                                                                                                                   |
| `knip.jsonc`                                                                                | Per-workspace entries for `apps/marketing` and `infra/task-cache`                               | Removed; knip then reported `T3_PROJECT_FILE_SCHEMA_URL` as an unused export, which is the only knip finding in this PR                                                                                                                                                                                            |
| `.github`                                                                                   | One action input + one conditional step + five `with:` blocks                                   | Removed                                                                                                                                                                                                                                                                                                            |
| `packages/shared`                                                                           | `buildT3ProjectFileJsonSchema`, sole caller in `apps/marketing/src/pages/schema/t3.json.ts`     | Removed with the caller                                                                                                                                                                                                                                                                                            |
| `apps/mobile/README.md`                                                                     | Documented a login step for a service that no longer exists in-repo                             | Rewritten to name the local cache as the default                                                                                                                                                                                                                                                                   |
| `.pnpmfile.cjs`                                                                             | Comment explained a peer-resolution bug by pointing at `apps/marketing`'s `typescript@6.0.3`    | Reworded to name the real cause (the `@tsc-rs` version falling outside `vite-plus-core`'s peer range); the hook itself is untouched                                                                                                                                                                                |
| `scripts/mobile-native-client.ts`                                                           | Two comments pointing into `infra/task-cache/`                                                  | Reworded. The `.task-cache.json` and `~/.config/t3-task-cache/` **reads stay**: they resolve config that lives outside the repo, so an operator who self-hosts their own artifact cache keeps the shared-native-client path working. Deleting the reads would have removed a working feature to tidy a deleted one |
| `apps/mobile/src/features/settings/lib/legal-document-url.ts`, `apps/web/src/legalLinks.ts` | Legal links pointing at `t3.codes`                                                              | **Not touched.** These are URLs on t3's site, not imports of `apps/marketing/`; they are a branding concern (TS7/PR6) and changing them here would mix layers                                                                                                                                                      |
| `AGENTS.md` cut list                                                                        | Names both paths                                                                                | Left as is: it is the list of things that must never come back                                                                                                                                                                                                                                                     |

## Reject criteria

- Either path exists, or a reference to it survives anywhere outside `AGENTS.md`'s cut list.
- Anything else is deleted. This PR is two directories and their references; a third deletion
  is out of layer and belongs in another PR.
- `run.cache` loses the local cache (`scripts: false` must stay), so every package starts
  rebuilding on CI and locally for no reason.
- A web/server/desktop/mobile runtime import had to be rewired to make the cut land — that
  would mean the coupling assumption is wrong and this is not PR2-sized work.
- `vp run check:changed` or `vp run knip:check` red, or a repo-wide check run instead.
- Legal-link or other branding edits smuggled in here instead of PR6.

## What we reused

| Question                                                 | Answer                                                                                                                       | Where                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | No — nothing in them models a marketing site or a build-cache deployment; the only touch is removing an export from `shared` | `packages/shared/src/t3ProjectFile.ts` |
| Upstream module (existing service, one method added)     | No — no service method is added or changed. The task-cache hook was wired in root config, not through a service              | `vite.config.ts`                       |
| Existing component (`components/ui`, feature component)  | No — nothing rendered. No component, route, or screen changes                                                                | —                                      |

CUSTOM: none. This PR adds no file but its own ACCEPT; every other change is a deletion or a
deletion's reference. (justification: the slice is the cut itself, which is the only custom
work TS0 permits.)

## Patterns and model files

- Patterns followed: the cut style the issue set — delete the module, keep the surrounding
  contract intact, and let knip be the safety net for anything left unreachable. No new
  abstraction, no flag, no stub: both paths are on the "deleted outright" side of the issue's
  cut rule, not the re-export-stub side, because neither is a core file path.
- Files added: `ACCEPT/1-marketing-task-cache.md`
- Files deleted: `apps/marketing/` (84 tracked files), `infra/task-cache/` (63 tracked files),
  `.task-cache.json`
- Files edited: `vite.config.ts`, `package.json`, `knip.jsonc`, `pnpm-lock.yaml`,
  `.github/actions/setup-ci-deps/action.yml`, `.github/workflows/ci.yml`,
  `packages/shared/src/t3ProjectFile.ts`, `packages/contracts/src/t3ProjectFile.ts`,
  `apps/mobile/README.md`, `.pnpmfile.cjs`, `scripts/mobile-native-client.ts`
- Deliberately untouched: `.gitignore`'s `.astro` entry and the `:(glob)**/.astro/**` glob in `scripts/check-changed.ts` — neither is a reference knip can reach, and editing a CI hashing script for a deleted directory is a third deletion.
- Model files: `.github/actions/setup-ci-deps/action.yml` for how this repo retires a
  secret-gated CI step (drop the input and every `with:` at once, keep the rest of the job),
  and `vite.config.ts`'s own `run` block for the shape of a cache config.

## Run report

See the PR body.
