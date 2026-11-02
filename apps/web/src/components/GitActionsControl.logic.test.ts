import { SourceControlProviderKind, type VcsStatusResult } from "@t3tools/contracts";
import { resolveAutoFeatureBranchName } from "@t3tools/shared/git";
import { assert, describe, it } from "vite-plus/test";
import {
  buildMenuItems,
  requiresDefaultBranchConfirmation,
  resolveDefaultBranchActionDialogCopy,
  resolveLiveThreadBranchUpdate,
  resolveQuickAction,
} from "./GitActionsControl.logic";

function status(overrides: Partial<VcsStatusResult> = {}): VcsStatusResult {
  return {
    isRepo: true,
    hasPrimaryRemote: true,
    isDefaultRef: false,
    refName: "feature/test",
    hasWorkingTreeChanges: false,
    workingTree: {
      files: [],
      insertions: 0,
      deletions: 0,
    },
    hasUpstream: true,
    aheadCount: 0,
    behindCount: 0,
    pr: null,
    ...overrides,
  };
}

describe("when: the ref is ahead of upstream", () => {
  it("prefers push", () => {
    const quick = resolveQuickAction(status({ aheadCount: 3 }), false);
    assert.deepInclude(quick, { kind: "run_action", action: "push", label: "Push" });
  });
});

describe("fork invariant: no change request is offered from the git menu", () => {
  it("lists only commit and push, however the ref is positioned", () => {
    const syncedFeature = status({ aheadCount: 0, aheadOfDefaultCount: 1 });
    assert.deepEqual(
      buildMenuItems(syncedFeature, false).map((item) => item.id),
      ["commit", "push"],
    );
    assert.deepEqual(
      buildMenuItems({ ...syncedFeature, hasWorkingTreeChanges: true }, false).map(
        (item) => item.id,
      ),
      ["commit", "push"],
    );
    assert.deepInclude(resolveQuickAction(syncedFeature, false), {
      kind: "show_hint",
      hint: "Branch is up to date. No action needed.",
    });
  });

  it("keeps push-only labels on a host that names change requests differently", () => {
    const gitLab = {
      sourceControlProvider: {
        kind: SourceControlProviderKind.make("gitlab"),
        name: "GitLab",
        baseUrl: "https://gitlab.com",
      },
    };
    const ahead = status({ ...gitLab, hasUpstream: false, aheadCount: 2 });
    assert.deepInclude(resolveQuickAction(ahead, false), { label: "Push", action: "push" });
    assert.equal(
      resolveQuickAction(status({ ...gitLab, hasWorkingTreeChanges: true }), false).label,
      "Commit & push",
    );
    const copy = resolveDefaultBranchActionDialogCopy({
      branchName: "main",
      includesCommit: false,
    });
    assert.equal(copy.title, "Push to default ref?");
    assert.include(copy.description, 'push local commits on "main"');
    assert.equal(copy.continueLabel, "Push to main");
  });
});

describe("when: on the default ref with local changes", () => {
  it("commits and pushes", () => {
    const quick = resolveQuickAction(
      status({ refName: "main", hasWorkingTreeChanges: true }),
      false,
    );
    assert.deepInclude(quick, {
      kind: "run_action",
      action: "commit_push",
      label: "Commit & push",
      disabled: false,
    });
  });
});

describe("when: local changes are behind upstream", () => {
  it("keeps the commit action available without pushing", () => {
    assert.deepEqual(
      resolveQuickAction(status({ hasWorkingTreeChanges: true, behindCount: 2 }), false),
      {
        label: "Commit",
        disabled: false,
        kind: "run_action",
        action: "commit",
      },
    );
  });
});

describe("when: ref has no upstream configured", () => {
  it("pushes once commits exist", () => {
    assert.deepInclude(resolveQuickAction(status({ hasUpstream: false, aheadCount: 2 }), false), {
      kind: "run_action",
      action: "push",
      label: "Push",
      disabled: false,
    });
  });

  it("publishes when no origin remote exists", () => {
    assert.deepEqual(
      resolveQuickAction(status({ hasUpstream: false, aheadCount: 2 }), false, false),
      { kind: "open_publish", label: "Publish repository", disabled: false },
    );
  });
});

describe("requiresDefaultBranchConfirmation", () => {
  it("requires confirmation for push actions on default ref", () => {
    assert.isFalse(requiresDefaultBranchConfirmation("commit", true));
    assert.isTrue(requiresDefaultBranchConfirmation("push", true));
    assert.isTrue(requiresDefaultBranchConfirmation("create_pr", true));
    assert.isTrue(requiresDefaultBranchConfirmation("commit_push", true));
    assert.isTrue(requiresDefaultBranchConfirmation("commit_push_pr", true));
    assert.isFalse(requiresDefaultBranchConfirmation("commit_push", false));
    assert.isFalse(requiresDefaultBranchConfirmation("push", false));
  });
});

describe("resolveLiveThreadBranchUpdate", () => {
  it("returns a branch update when live git status differs from stored thread metadata", () => {
    const update = resolveLiveThreadBranchUpdate({
      threadBranch: "feature/old-ref",
      gitStatus: status({ refName: "effect-atom" }),
    });

    assert.deepEqual(update, {
      branch: "effect-atom",
    });
  });

  it("returns null when git status is detached HEAD but the thread already has a ref", () => {
    const update = resolveLiveThreadBranchUpdate({
      threadBranch: "effect-atom",
      gitStatus: status({ refName: null }),
    });

    assert.equal(update, null);
  });

  it("does not regress a semantic thread ref back to a temporary worktree ref", () => {
    const update = resolveLiveThreadBranchUpdate({
      threadBranch: "t3code/github-query-rate-limit",
      gitStatus: status({ refName: "t3code/bda76797" }),
    });

    assert.equal(update, null);
  });
});

describe("resolveAutoFeatureBranchName", () => {
  it("increments suffix when the preferred ref name already exists", () => {
    const ref = resolveAutoFeatureBranchName(
      ["main", "feature/fix-toast-copy", "feature/fix-toast-copy-2"],
      "fix toast copy",
    );
    assert.equal(ref, "feature/fix-toast-copy-3");
  });

  it("treats existing ref names as case-insensitive for collision checks", () => {
    const ref = resolveAutoFeatureBranchName(["Feature/Ticket-1"], "feature/ticket-1");
    assert.equal(ref, "feature/ticket-1-2");
  });
});
