# ACCEPT/6-onboarding-botki-banner

Issue: [adhorodyski/botki#6](https://github.com/adhorodyski/botki/issues/6) — TS1b demo slice:
a fresh agent closes a micro-task using only `AGENTS.md` and the issue.

## Acceptance checklist

- [x] A "Botki" line appears in the first screen of the welcome wizard, using `components/ui`
      primitives and design tokens rather than ad-hoc styling — one prop added at
      `apps/web/src/components/onboarding/WelcomeWizard.tsx:236`: the wizard's existing
      `WizardHeader` now takes `description="Botki runs coding agents on a schedule and reports
      back."`, which renders through `DialogDescription` (`text-muted-foreground text-sm`, a
      token, no `className`). See capture below.
- [x] No new component is added to `apps/web/src/components/ui` — `git diff --stat` is one file,
      one line, inside `components/onboarding/`; the reuse table names the primitive
      (`WizardHeader` → `DialogDescription`).
- [x] Existing welcome-wizard browser tests still pass, plus the focused check for changed
      files — `vp test run apps/web/src/components/onboarding/WelcomeWizard.import.browser.test.tsx`
      → **3 passed**; `vp run check:changed` → all steps pass (see run report).
- [x] This file exists, written from `ACCEPT/template.md`, reuse table filled, reject criteria
      kept.
- [ ] `vp run check:changed` green, and the run-report in the PR body — checks are green and the
      footer is in the PR body; the last box stays open until the reviewer confirms the capture.

## Replay scenario

No provider turn is involved: the banner is the setup dialog's header, which renders before any
thread exists. Nothing here touches chat rendering or thread history, so neither the ACP picker
nor `pi_chat_demo` applies. The free path is simply `vp run dev`, which shows the wizard on first
run (or clear the `t3-onboarding-complete` flag in devtools to re-show it).

## Reference captures

**Pending the primary agent's single integrated browser pass** (this subagent did not start a dev
server). `ACCEPT/captures/6/welcome-wizard-botki-banner.png` should show the first step of the
setup wizard ("Connect your computers") with, in the header block, the wordmark row, the title
`Set up T3 Code`, the step tracker, and directly beneath the title the muted line
`Botki runs coding agents on a schedule and reports back.` That line inheriting the dialog
description's grey token (not a bespoke colour) and the tracker/steps being unshifted is the proof.

## Reject criteria

- Fails `vp run check:changed`, or a repo-wide check was run instead of the focused one.
- Reintroduces anything on [the cut list](../AGENTS.md#the-cut-list-fork-rule-never-reintroduce).
- Reuse-first audit has an empty row, or a row claims "no" without the one-line justification.
- New abstraction where an existing service method or `components/ui` variant would have done —
  in particular: a new banner component, a `variant` added to `ui/wizard`, or `className` styling
  on `WizardHeader`/`DialogTitle` to place the copy.
- Any rebranding outside this one line. Other "T3 Code" strings in the wizard (title, privacy
  copy, pairing copy, `npx t3` commands) belong to TS7; changing them here is out of scope.
- No focused test for a backend behavior change, or a UI test for a nitpick instead of a capture.
  This slice ships no new test on purpose: the change is copy in a header, and AGENTS.md excludes
  copy-text tests in favour of a capture.
- Run-report missing, or it lists checks that were not actually run.

## What we reused

| Question                                                 | Answer                                                                                                                                                                                                    | Where                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | No — nothing there models onboarding copy; no wire concept is involved                                                                                                                                    | —                                                                                                              |
| Upstream module (existing service, one method added)     | No — server-side; nothing to add                                                                                                                                                                          | —                                                                                                              |
| Existing component (`components/ui`, feature component)  | **Yes** — `WizardHeader` already accepts a `description` and renders it through `DialogDescription` (muted token text); used by six other dialogs. The feature component `WelcomeWizard` passes the prop. | `apps/web/src/components/ui/wizard.tsx:29`, `ui/dialog.tsx:179`, `components/onboarding/WelcomeWizard.tsx:236` |

CUSTOM: nothing. Zero new components, zero new styles — one string, one existing prop.

## Patterns and model files

- Patterns followed: web — the look comes from the existing `components/ui` primitive, copy lives
  in the wizard's own step component rather than `components/ui`, design token
  (`text-muted-foreground`) rather than a fixed colour, no `className` restyle, no layout change
  (header stacks its children).
- Files added or renamed: `ACCEPT/6-onboarding-botki-banner.md` (this file). No code file added or
  renamed; `apps/web/src/components/onboarding/WelcomeWizard.tsx` is edited by one line.

## Run report

See the PR body.
