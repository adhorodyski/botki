name: Spec
description: A slice a night agent can build, verify, and submit without questions back to the owner.
title: ""
labels:

- slice
  body:
- type: markdown
  attributes:
  value: |
  A spec is only workable if a night agent can close it unattended: the demo,
  the commands, and the reject criteria all have to be written down here.
  One issue is one PR. Reuse answers come before code, not after.

- type: textarea
  id: user-story
  attributes:
  label: User story
  description: Who this is for and what they can do afterwards. One or two sentences.
  placeholder: As the owner, I want … so that …
  validations:
  required: true

- type: textarea
  id: demo
  attributes:
  label: Demo
  description: What the reviewer sees, in order, with the exact commands. Anything the reviewer has to guess at is a gap in the spec.
  placeholder: | 1. `git clone && pnpm i && pnpm run dev` → server on localhost. 2. Onboarding: add a Pi provider → chat → history survives a server restart.
  validations:
  required: true

- type: textarea
  id: acceptance
  attributes:
  label: Acceptance checklist
  description: One item per requirement, each phrased so a command or a capture settles it. The night agent copies this into `ACCEPT/<issue-number>-<slug>.md` verbatim.
  value: | - [ ] - [ ] `vp run check:changed` green, run-report in the PR body
  validations:
  required: true

- type: textarea
  id: reuse
  attributes:
  label: Reuse-first audit
  description: Answer all three before writing code. Custom work is allowed only after all three fail, with a one-line justification.
  value: |
  | Area | Core primitive (`contracts`/`shared`/`client-runtime`) | Upstream module (existing service) | Existing component (`components/ui`/feature) | CUSTOM + one-line why | | --- | --- | --- | --- | --- |
  | | | | | |
  validations:
  required: true

- type: textarea
  id: patterns
  attributes:
  label: Patterns and model files
  description: The idioms the change must match (server Context.Service + Layer, contracts Schema, web variant/size + design tokens, colocated tests) and the files it adds or renames.
  value: |
  Patterns to follow:
  Files this adds or renames:
  validations:
  required: true

- type: textarea
  id: out-of-scope
  attributes:
  label: Out of scope
  description: What this slice deliberately does not do. This is the main defense against a night agent widening the PR.
  validations:
  required: true

- type: textarea
  id: dependencies
  attributes:
  label: Dependencies
  description: Blocked by / blocks (issue numbers), plus any risk worth naming and how it is mitigated.
  value: | - Blocked by: - Blocks: - Risk:
  validations:
  required: true
