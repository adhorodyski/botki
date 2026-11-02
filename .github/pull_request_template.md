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

## Requirements status

<!-- Copy the issue's acceptance checklist here verbatim. Mark every item done, with the
command or capture that settles it, or not run, with the reason. Nothing from the issue
gets left unmarked. The owner reads this section and merges. Captures are uploaded to
GitHub in this PR, never committed. If the feature is ours over t3code, its specs/ file
is updated in this same PR; everything else touches nothing there. -->

## Verification

<!-- The focused tests or manual checks you ran and the observed results for the changed
behavior. State anything you could not check. "Tests pass" alone is insufficient; do not
run repo-wide checks. For visible changes, include before/after captures uploaded to
GitHub, and a short recording for motion or timing. Replay scenario used, if any. -->

## Run report

<!-- Required. If you could not finish, open a draft PR with this filled in and the blocker named. -->

```
Ran:
Passed:
Untouched:
```

<!-- If you used an agent, end with the model and harness that did the work. -->
