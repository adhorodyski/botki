# ACCEPT/3-cloud-account-surface

TS0 PR3 — the cloud account surface is gone: Clerk auth, T3 Connect, guest shares, the hosted
relay, and the outbound telemetry path. Written from [template.md](template.md) against the
issue's acceptance checklist.

Issue: [adhorodyski/botki#1](https://github.com/adhorodyski/botki/issues/1) (PR 3 of the plan in
that issue: "PR3 cloud/Clerk/relay/guest/telemetry-out").

## What this slice is

Five deletions, plus the local replacements the issue allows for `publicConfig` and the desktop
login:

- **Clerk + T3 Connect** — `apps/web/src/cloud/`, the cloud half of `apps/server/src/cloud/`,
  `DesktopClerk`/`ClerkTokenStore`, every `@clerk/*` dependency except the mobile app's, the
  `t3 connect` CLI path, and `EnvironmentConnectHttpApi` in contracts.
- **Guest shares** — `apps/server/src/guest/`, `apps/web/src/components/guest/`,
  `guestPage.ts`, `routes/guest.tsx`, `HostedEmptyState`, `GuestMessageAttachments`, and the
  share entry points in ChatHeader, ChatView, CommandPalette, Sidebar, and the thread menu.
- **Hosted relay** — `infra/relay/` in full (the Alchemy stack), the server's relay client and
  delivery-proof path, and the relay delivery proof on the scheduled-task webhook route.
- **Telemetry out** — `AnalyticsService.layer` now succeeds an empty sink. Its interface and the
  identity/dimension modules stay so upstream fixes to call sites keep cherry-picking.
- **Their docs** — the four runbooks and internals notes whose subject this PR deletes and which
  link into now-deleted source paths.

Everything else stays. Pairing code, the relay-shaped `client-runtime` types the mobile app still
imports, `cloud/config.ts` secret key names (the local server and `AgentAwarenessRelay` read
them), and the whole `auth/` surface except the Clerk path are untouched or barely touched.

## Acceptance checklist

- [x] **Desktop dev reaches a usable shell against localhost** (the owner's primary path) —
      `vp run dev:desktop` → Electron starts, discovers the local server over
      `/.well-known/t3/environment`, exchanges `/oauth/token` → `200`, opens
      `/api/auth/websocket-ticket/rpc` → `200`, then `GET /api/orchestration/shell` → `200`. No
      Clerk request appears anywhere in the log. Full transcript in the PR body's run report.
- [x] **Web dev works on loopback** — `vp run dev` printed
      `pairingUrl: http://localhost:6767/pair#token=…`; opening that URL in the Browser panel
      paired, loaded the shell, and rendered the seeded thread list.
- [x] **No `@clerk` import or dependency outside the mobile app** —
      `grep -rn "@clerk" apps/web/src apps/desktop/src apps/server/src packages/*/src
      apps/web/package.json apps/desktop/package.json` → **no matches**. Mobile keeps
      `@clerk/expo`: that cut is TS9's, not this PR's.
- [x] **No outbound call to a t3 endpoint from a browser session** — with the app open across
      `/pair`, `/settings/connections`, `/settings/labs`, `/settings/scheduled-tasks`, and the old
      `/guest` URL, `performance.getEntriesByType("resource")` over 250 requests reported
      **zero non-`localhost` origins**.
- [x] **No telemetry egress from the server** — `grep -rn "ingest\.t3\|posthog\|api\.axiom"
      apps/server/src apps/web/src apps/desktop/src packages/*/src` → **no matches**. The only
      remaining `api.axiom.co` default is `apps/mobile/app.config.ts:455`, which TS9 owns.
- [x] **`t3 up` has one route: the local network** — `apps/server/src/cli/up.ts` is now
      `planLanRoute` alone; `up.connect.test.ts` is deleted and `up.test.ts` covers the LAN route.
- [x] **UI exposes no entry point to Clerk, T3 Connect, or guest links** — see the two captures
      below and `ACCEPT/captures/3/`. Labs lost Guest links / T3 Connect / hold-webhooks /
      publish-agent-activity, and the `cloudOnly`/`managedTunnelOnly` search filter concept went
      with them, so those rows cannot come back as a hidden flag.
- [x] **Old cloud URLs are dead** — `/api/guest/render` → `404`; `/guest?share=…` renders the
      local shell with no guest affordance (the SPA serves `index.html` for any path, which is
      correct behaviour, not a surviving route).
- [x] **Nothing left unreachable** — `vp run knip:check` → **both commands exit 0**, including
      the exports pass, which forced the removal of ~45 exports that only the cloud surface used.
- [x] **Pi path still renders** —
      `vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo`
      → **1 passed**. This PR touches no renderer, so the fixture is the proof; see below.
- [x] **`pnpm-lock.yaml` regenerated** — `pnpm install --lockfile-only --ignore-scripts`,
      2,130 lines removed; `infra/*` is out of `pnpm-workspace.yaml`, so `infra/relay` can never
      be re-installed by an `i` on a fresh clone.
- [x] **The docs this PR invalidated are gone, not stale** — `guest-links.md`,
      `internals/t3-connect.md`, `operations/connect-setup.md`, and `operations/relay-observability.md`
      are deleted; no reference to them survives anywhere; no command in a kept doc tells you to
      `cd infra/relay`; the two kept docs that stated deleted behavior were rewritten to match
      (`internals/product-analytics.md`, `user/telemetry.md` + the FAQ answer that pointed at it);
      and `internals/environment-auth.md` lost its guest-link section and `internals/remote.md` its
      link to the deleted trust-boundary note.
- [x] **Known docs debt, deliberately left for PR6** (the issue's "doc/comment mentions may
      remain" line, and its PR6 is "NOTICE + README + final sweep"): `user/remote-access.md`,
      `user/faq.md`, `user/welcome-wizard.md`, `user/background-service.md`, and
      `user/mobile-notifications.md` still describe T3 Connect prose, and
      `user/t3-connect-troubleshooting.md` still exists because `client-runtime` connection
      diagnosis still anchors into its headings for the mobile app. None of them links a deleted
      file or tells you to run a command that no longer exists; they read as upstream text until
      PR6 sweeps them.
- [x] `vp run check:changed` green, and the run-report in the PR body

## Replay scenario

`pi_chat_demo`, the free Pi-path fixture, cited rather than re-recorded:

```sh
vp test run apps/server/src/orchestration-v2/testkit/PiReplayFixtures.integration.test.ts -t pi_chat_demo
```

What it proves here is the thing this slice could plausibly break: a two-turn Pi turn where the
second turn repeats a marker only the first established, i.e. the adapter, orchestration, and
thread history still carry provider-side state after the server's layer graph lost its cloud
providers. Nothing in this PR renders differently, so there is no new visual to look for; run
`showcase` in the picker if you want to watch a turn stream anyway.

## Reference captures

In `ACCEPT/captures/3/`, uploaded to the PR:

- `settings-environments-no-cloud-link.png` — Settings → Environments with the seeded database
  present. No account row, no "T3 Connect" row, no sign-in prompt; the empty state says only
  "No saved remote environments" with the pairing action.
- `settings-labs-no-rows.png` — Labs after the cut: Beta holds Boring sidebar, Two-line folder
  rows, Linked environments, and Simlock. The Guest-links row and all three cloud-only rows are
  gone, and Settings search cannot find them because the filter that hid them no longer exists.

Both were taken against this worktree's own seeded `.t3` state with the sidebar collapsed, so no
third-party project names from the fixture appear.

## Reject criteria

- Fails `vp run check:changed`, or a repo-wide check was run instead of the focused one.
- Any `@clerk/*` dependency or import returns outside `apps/mobile`, or `infra/relay` comes back
  in any form (including the `infra/*` workspace glob).
- Analytics gains a destination without an owner decision. The sink must stay the one cut point:
  no `isTelemetryEnabled` checks spread through the server.
- A renderer, route, or component is deleted to make a typecheck pass. The issue's rule is cut
  functions, not renderers; if a render path had to go, that is the wrong fix.
- The desktop app reaches a server other than the local one, or a pairing step is required to
  open the desktop shell.
- Mobile cloud deletion sneaks in here. TS9 owns `@clerk/expo`, `apps/mobile/src/features/cloud/`,
  and the mobile relay surface.
- Reuse-first audit has an empty row, or a row claims "no" without a justification.
- Run-report missing, or it lists checks that were not actually run.

## What we reused

| Question                                                 | Answer                                                                                                                                        | Where                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | Yes — `ClientCapabilities.CloudSession` and `ManagedRelay.ManagedRelayClient` already define the seams the web app needed to stub locally     | `packages/client-runtime/src/platform/capabilities.ts`      |
| Upstream module (existing service, one method added)     | Yes — `AnalyticsService` kept as the sink; no service gained a method. The webhook route dropped its relay-proof branch instead of adding one | `apps/server/src/telemetry/AnalyticsService.ts`             |
| Existing component (`components/ui`, feature component)  | Yes — `connectionStatusText` and the existing `EnvironmentRow`/`Empty` render the trimmed rows; nothing restyled                              | `apps/web/src/components/settings/SavedEnvironmentRows.tsx` |

CUSTOM: `apps/web/src/lib/noRelay.ts`, `apps/web/src/lib/browserCrypto.ts`, and
`apps/desktop/src/app/DesktopAppLinks.ts`. Justification: three local replacements the issue
names explicitly — the web app needs a no-op relay layer and a browser crypto layer to build a
runtime without Clerk, and desktop needs its launch links (second-instance lock, `open-url`,
`open-file`, Codex auth handoff) in a module that is not the Clerk bridge that used to own them.

## Patterns and model files

- Patterns followed: server layers stay `Layer.mergeAll` / `provideMerge` graphs with the cloud
  layers simply absent; contracts keep `Schema` structs and lose the deleted group; web keeps
  `components/ui` variants untouched and deletes features rather than restyling; the no-op sink
  follows the `Context.Service` + `Layer.succeed` shape already used by local-only services.
- Files added: `ACCEPT/3-cloud-account-surface.md`,
  `apps/web/src/lib/noRelay.ts`, `apps/web/src/lib/browserCrypto.ts`
- Files renamed: `apps/desktop/src/app/DesktopClerk.ts` → `apps/desktop/src/app/DesktopAppLinks.ts`
  (kept its launch-link duties, dropped the Clerk bridge)
- Files deleted: 247 — 132 under `infra/relay/`; 58 under `apps/web/src` (19 `cloud/`, 34 under
  `components/`, the `connect` and `guest` routes, `guestPage.ts`, and two runtime tests that only
  covered the relay path); 41 in `apps/server/src` (26 `cloud/`, 8 `guest/`, plus the connect CLI,
  the relay delivery proof, and the ingest transport); 5 in `apps/desktop` (the Clerk bridge, its
  token store, and the pre-ready file system only it used); 3 in `apps/mobile` (cloud link + the
  live-activity test that mocked it); `packages/{shared,contracts}/src/relayClient*`; the alchemy
  patch; and 4 docs this PR invalidated. Full list in the PR's file tab.
- Model files: `apps/server/src/telemetry/DelegatedTaskAnalytics.ts` for how a kept service reads
  the sink, `packages/client-runtime/src/relay/managedRelay.ts` for the layer the web stubs, and
  `ACCEPT/1-marketing-task-cache.md` for the coupling-audit shape.
- Deliberately untouched: `apps/server/src/relay/AgentAwarenessRelay.ts` and
  `apps/server/src/cloud/config.ts` secret names (the local server and its tests read them);
  `packages/shared/src/relayTracing.ts` (mobile tracing imports it); `packages/shared/src/telemetryId.ts`
  (`Identify.ts` and the remote authorization path hash through it); every
  `packages/source-control-*` and PR/triage/worktree file (PR4's layer); `apps/mobile` except the
  two files that imported a deleted module.

## Run report

See the PR body.
