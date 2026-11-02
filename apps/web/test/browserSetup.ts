import { beforeEach, vi } from "vite-plus/test";
import { commands } from "vite-plus/test/browser";

declare module "vite-plus/test/browser" {
  interface BrowserCommands {
    /** Defined in vite.config.ts. Moves Playwright's mouse off the page. */
    resetPointer: () => Promise<void>;
  }
}

// Playwright's mouse outlives each test and each file, so whatever the next test mounts
// under its last position starts hovered. Registered here rather than in render() so tests
// that mount without it are covered too. Before each test, not after: a timed-out test keeps
// running and can move the mouse after its own afterEach.
beforeEach(async () => {
  await commands.resetPointer();
});

// Vite serves the pdf.js worker through its transform with an inline source map: 6.8 MB for a
// 1.2 MB file. Each PDF.js document spawns a fresh worker, so a test that reloads a document
// parses that blob again per revision and starves the page it is measuring. The raw file in a
// blob is the same worker code without the dev-server cost.
vi.mock(import("pdfjs-dist/build/pdf.worker.min.mjs?url"), async () => {
  const { default: source } = await import("pdfjs-dist/build/pdf.worker.min.mjs?raw");
  return { default: URL.createObjectURL(new Blob([source], { type: "text/javascript" })) };
});
