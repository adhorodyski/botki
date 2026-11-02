# specs

One file per feature **we** add on top of t3code — TS1 "Add bot", TS2 TeamChat, TS3
needs-you. `specs/<issue-number>-<slug>.md`, named after the issue that introduced it.

A spec describes owner-visible behavior: what the feature does, what it does not, how it
presents itself. Not implementation, not a task list, not a run log.

- The PR that changes a feature's behavior updates its spec in the same PR. New behavior,
  new paragraph. Removed behavior, delete the paragraph.
- Cut PRs, bugfixes, infra, and refactors add nothing here and touch nothing here.
- Merge-readiness is never a file. It lives in the PR body's **Requirements status** section.

TS1 adds the first spec. There are none yet.
