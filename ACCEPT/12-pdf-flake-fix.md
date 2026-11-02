# ACCEPT/12-pdf-flake-fix

TS0 flake fix for
[#12](https://github.com/adhorodyski/botki/issues/12) — the two workspace-PDF cases in
`AttachmentFilePreview.browser.test.tsx` that pass standalone and fail under full-suite load,
making `Test Web` (and therefore `Check`) red for every PR.

## The one judgement that decides everything

The `Timeout 421ms` in the failed runs is **not a configured 421 ms timeout**. Vitest's browser
context resolves an action's timeout as "explicit option, then the provider default, then the
**remaining task time**" (`@vitest/browser/dist/context.js`, `resolveActionTimeout`). No
`actionTimeout` is configured, so every Playwright action gets whatever the 15 s `testTimeout`
has left. `421ms` was the _residue_: the test had already burned 14.58 s, and the next
`locator.click` was allowed 421 ms of it. The failing CI test is reported at **15130ms** — the
task ceiling, not a locator being slow.

So the fix is not "wait longer". It is "spend far less per test", and there were two separate
sinks.

## Diagnosis (measured, not assumed)

| Measurement (same test, `keeps workspace PDF scroll and zoom after reloads`) | Before                                    | After                 |
| ---------------------------------------------------------------------------- | ----------------------------------------- | --------------------- |
| Standalone, quiet machine                                                    | 2767 ms                                   | 991 ms                |
| Inside the full `browser` project, 138 files                                 | 12402 ms, 11195 ms                        | 3457 / 2347 / 2716 ms |
| Same, on CI (`#15` run)                                                      | 15130 ms → **failed at the 15 s ceiling** | see run-report        |

Sink 1 — **pdf.js worker served as 6.8 MB.** `pdfDocument.ts` imports
`pdfjs-dist/build/pdf.worker.min.mjs?url`, and Vite serves it through its transform with an inline
source map: I measured the response the test browser actually fetches at **6,805,609 bytes for a
1,264,342-byte file**. Each PDF.js document spawns a fresh worker, and this test reloads the
document 5 times, so the page re-parses a 6.8 MB script per revision while Playwright is trying to
click it. `PdfViewer.browser.test.tsx` already knew this and mocked the worker away with a
`?raw` blob — but the mock lived **inside that one file**, so the attachment test, which renders
the same lazy `PdfViewer`, paid the full cost. Promoting the mock to `test/browserSetup.ts` fixes
it for every browser test and removes the per-file copy. Verified lazy: the `?raw` read runs only
in files that actually import the worker (1 of 138), not in the other 137.

Sink 2 — **~20 Playwright action round trips per test.** Probed individually under full-suite
load: first 8 actions = **4926 ms** (clicks at 263–1536 ms each; a `locator.click` costs a
contextId/frame lookup, hit-test, scroll, dispatch, and a round trip). Two tests × ~20 actions is
the rest of the 11 s. The toolbar walk needs no real mouse: these cases assert page counter, zoom
label, and scroll offsets. Both tests now press the toolbar and read the counter **in-page**
(`act(() => node.click())`, the idiom this file already uses elsewhere), and each keeps **one real
Playwright click** (`Next page`) so hit-testing, enabled state, and the locator path stay covered.
`expect.element(...).toBeVisible()` on the counter became `showsPage(...)`, which awaits the
viewer's `aria-live` counter directly with the 10 s the file already uses for worker-backed
milestones — the milestone is pdf.js parsing a fresh document in its worker, not a frame.

## What the issue's hypotheses were, checked honestly

- **"fixed 421 ms locator timeouts"** — no such config exists; it is the remaining-task budget. Confirmed above.
- **"font/render race"** — ruled out by measurement. Instrumented `BinaryDataFactory`: **zero**
  standardFont/cMap/wasm fetches happen in these tests (`useSystemFonts: true`, `useWorkerFetch: false`).
  Instrumented page paints: 6–34 ms each. Document parse: 154–474 ms. No font or paint ever takes seconds.
- **Test deletion / skip / blanket timeout bump** — none used. Zero `skip`, zero `it(..., { timeout })`,
  zero change to `testTimeout`/`hookTimeout`/`actionTimeout`. Only an explicit `waitFor` budget on the
  document-loaded condition, which the issue authorizes.

## Acceptance checklist

- [x] **Reproduce locally: passes alone, fails under full-suite load** — on `main`, the full
      `browser` project reproduced both shapes: `12402ms` pass (heavy load, near ceiling) and a
      forced `× keeps workspace PDF scroll and zoom after reloads 15031ms` failure with the
      `Timeout 421ms` signature. Standalone passed throughout. Matches the `#15` job log
      (`15130ms`, failing at `AttachmentFilePreview.browser.test.tsx:2564`).
- [x] **File green 10× in isolation** — `vp test run apps/web/src/components/files/AttachmentFilePreview.browser.test.tsx` ×10 → **10 pass / 0 fail**, 133/133 each time.
- [x] **Full web suite green 3× locally** — `vp test run --project browser` ×3 on the final tree →
      622 passed, 622 passed, 622 passed. (6 consecutive green in total on this branch's code.)
- [x] **No timeout increase, no skip, no deletion** — `git diff` adds no `skip`, no per-test
      `timeout`, no `retry`, and touches no project-level timeout; both PDF cases are still present
      and still assert everything they asserted (page counter, zoom label, `scrollLeft`, per-page
      offset, fit-width reset, cross-file reset).
- [x] **`vp run check:changed` green** — format, lint, knip ×2, typecheck (2 packages), test (2 files) all pass.
- [ ] **`Test Web` green 3× on CI** — tracked in the PR; this PR's run plus two re-runs.

## Replay scenario

No rendered surface changed, so nothing new to look at in the app: the product code is untouched.
The proof is the test suite itself, free and no paid turn:

```
vp test run apps/web/src/components/files/AttachmentFilePreview.browser.test.tsx        # 133 passed
vp test run --project browser                                                          # from apps/web: 622 passed
```

What to look for: the two cases named `keeps workspace PDF scroll and zoom after reloads` and
`clamps workspace PDF scroll when pages shrink or disappear` reporting **~1–4 s instead of
10–15 s**. The duration is the point — under load they were failing because they were slow, not
because an assertion was wrong.

## Reference captures

No screenshots; a flake's before/after is a duration, not a picture. The transcript is the
`--reporter=verbose` timing table above, and the CI evidence lives in this PR's `Test Web` runs.

## Reuse-first audit

| Question                                                 | Answer  | Where                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core primitive (`contracts`, `shared`, `client-runtime`) | no      | Nothing here is a wire or domain concept; this is browser-test harness cost.                                                                                                                                                                                                                                                                                                                            |
| Upstream module (existing server service)                | no      | No server surface involved.                                                                                                                                                                                                                                                                                                                                                                             |
| Existing component / existing test helper                | **yes** | Reused `test/browserSetup.ts` (the browser project's existing shared setup file, already the home of the cross-test `resetPointer` fix) rather than adding a third per-file mock; reused this file's existing `act(() => node.click())` and `vi.waitFor(..., 10_000)` idioms; reused the viewer's existing `aria-live` counter as the wait condition instead of adding a test-only hook to `PdfViewer`. |

CUSTOM: none. No new file, no new abstraction — the diff is 2 files moved into place, 1 mock
promoted, 1 mock deleted.

## Patterns and model files

- No production code changed. No new component or restyle, so `shadcn/no-restyle` is untouched.
- Comments: two, both constraints a reader cannot see in the code (the 6.8 MB transform, the
  remaining-task action timeout). `t3code/no-low-value-comments` clean.
- Files added: `ACCEPT/12-pdf-flake-fix.md`. Files modified: `apps/web/test/browserSetup.ts`,
  `apps/web/src/components/files/AttachmentFilePreview.browser.test.tsx`,
  `apps/web/src/components/files/PdfViewer.browser.test.tsx`. No renames, no deletions.
- Model files: `ACCEPT/11-orchestration-pr-surface.md` (measure-then-report shape).

## Reject criteria

- A fix that raises `testTimeout`, `hookTimeout`, or sets `browser.providerOptions.actionTimeout`
  — that buys wall-clock while leaving both sinks, and hides the next slow test the same way.
- Any `it.skip` / `it.todo` / deleted case / removed assertion.
- Replacing the whole toolbar walk with in-page clicks so that no real Playwright action remains;
  hit-testing and `disabled` state would stop being covered. Each test keeps one real click.
- Re-adding the worker mock per test file: the third copy is what let the attachment case drift
  into a 6.8 MB-per-document cost while its neighbour stayed fast.
- Mocking pdf.js itself, or asserting on paint output — these cases are about scroll/zoom state
  surviving reloads, and that stays asserted for real.
