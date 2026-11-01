<!--
Night agents: read AGENTS.md first. One issue is one PR, commits are `night(<slice>): …`,
and never force-push. Conventional commit titles in plain language, such as
"fix(web): new threads no longer spike CPU". Delete this comment.
-->

## Problem

<!-- One issue link and the problem in a sentence or two. Expected behavior and
reproduction or environment where relevant. -->

Closes #

## Change

<!-- How this fixes the problem. If it spans components or clients, explain why those
changes are needed for the same fix. Split independent fixes. -->

## Reuse-first audit

<!-- Fill every row before code, from the issue. Custom work only after all three fail. -->

| Area | Core primitive (`contracts`/`shared`/`client-runtime`) | Upstream module (existing service) | Existing component (`components/ui`/feature) | CUSTOM + one-line why |
| ---- | ------------------------------------------------------ | ---------------------------------- | -------------------------------------------- | --------------------- |
|      |                                                        |                                    |                                              |                       |

## Patterns and model files

- Patterns followed: <!-- server Context.Service + Layer, contracts Schema, web variant/size + design tokens, naming, colocated tests -->
- Files added or renamed: <!-- every one -->

## ACCEPT

<!-- Path to this slice's file: ACCEPT/<issue-number>-<slug>.md. One PR = exactly one
ACCEPT file, or one line here saying why not. -->

## Verification

<!-- The focused tests or manual checks you ran and the observed results for the changed
behavior. State anything you could not check. "Tests pass" alone is insufficient; do not
run repo-wide checks. For visible changes, include before/after captures in
ACCEPT/captures/<issue>/ or uploaded to GitHub, and a short recording for motion or timing.
Replay scenario used, if any. -->

## Run report

<!-- Required. If you could not finish, open a draft PR with this filled in and the blocker named. -->

```
Ran:
Passed:
Untouched:
```

<!-- If you used an agent, end with the model and harness that did the work. -->
