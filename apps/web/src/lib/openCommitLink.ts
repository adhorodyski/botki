import type { ScopedThreadRef } from "@t3tools/contracts";
import { type MouseEvent } from "react";

import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";

import { canOpenLinksInApp } from "../browser/browserLinkTarget";
import { useOpenLink } from "../browser/useOpenLink";
import { useClientSettings } from "../hooks/useSettings";
import { stackedThreadToast, toastManager } from "../components/ui/toast";
import { selectActiveRightPanel, useRightPanelStore } from "../rightPanelStore";
import {
  selectThreadBranchBaseRef,
  selectThreadDiffPanelSelection,
  useDiffPanelStore,
} from "../diffPanelStore";

import { readProject, readThreadShell } from "../state/entities";
import { reviewEnvironment } from "../state/review";
import { useAtomQueryRunner } from "../state/use-atom-query-runner";

type CommitLinkClick = Pick<
  MouseEvent<HTMLElement>,
  "preventDefault" | "stopPropagation" | "metaKey" | "ctrlKey"
> &
  Partial<Pick<MouseEvent<HTMLElement>, "button" | "shiftKey" | "altKey">>;

/**
 * Open a host commit link whose repository is the thread's own checkout in the thread's diff
 * panel. Returns false for every other link, which opens wherever the browser would.
 */
export function useOpenCommitLink(
  threadRef?: ScopedThreadRef,
): (
  event: CommitLinkClick,
  targetUrl: string,
  targetThreadRef?: ScopedThreadRef,
  onCommitUnavailable?: () => void,
) => boolean {
  const ignoreWhitespace = useClientSettings((settings) => settings.diffIgnoreWhitespace);
  const browserLinkTarget = useClientSettings((settings) => settings.browserLinkTarget);
  const readDiffPreview = useAtomQueryRunner(reviewEnvironment.diffPreview, {
    reportFailure: false,
    refresh: true,
  });
  const openLink = useOpenLink(threadRef);
  return (event, targetUrl, targetThreadRef, onCommitUnavailable) => {
    const resolvedThreadRef = targetThreadRef ?? threadRef;
    const commitThread = resolvedThreadRef ? readThreadShell(resolvedThreadRef) : null;
    const commitProject =
      commitThread && resolvedThreadRef
        ? readProject({
            environmentId: resolvedThreadRef.environmentId,
            projectId: commitThread.projectId,
          })
        : null;
    const identity = commitProject?.repositoryIdentity;
    const parsedCommit = sourceControlClients.parseCommitUrl(targetUrl, identity?.provider);
    // Shift and Alt keep their browser meaning (new window, download) on commit links.
    if (parsedCommit === null || event.shiftKey || event.altKey) return false;
    if (
      !(
        commitThread !== null &&
        resolvedThreadRef !== undefined &&
        commitProject?.environmentId === resolvedThreadRef.environmentId &&
        identity !== null &&
        identity !== undefined &&
        identity.provider === parsedCommit.definition.kind &&
        parsedCommit.definition.isChangeRequestInRepository(identity, parsedCommit.link)
      )
    ) {
      return false;
    }
    const commit = parsedCommit.link;
    event.preventDefault();
    event.stopPropagation();
    const userActionRevision = useRightPanelStore.getState().markUserAction(resolvedThreadRef);
    const baseRef = selectThreadBranchBaseRef(useDiffPanelStore.getState(), resolvedThreadRef);
    const selection = selectThreadDiffPanelSelection(
      useDiffPanelStore.getState().byThreadKey,
      resolvedThreadRef,
    );
    void readDiffPreview({
      environmentId: resolvedThreadRef.environmentId,
      input: {
        cwd: commitThread.worktreePath ?? commitProject.workspaceRoot,
        ...(baseRef ? { baseRef } : {}),
        commitSha: commit.sha,
        ignoreWhitespace,
      },
    })
      .then((result) => {
        if (
          useRightPanelStore.getState().getUserActionRevision(resolvedThreadRef) !==
            userActionRevision ||
          selectThreadDiffPanelSelection(
            useDiffPanelStore.getState().byThreadKey,
            resolvedThreadRef,
          ) !== selection
        )
          return;
        if (
          result._tag === "Success" &&
          result.value.sources.some(
            (source) => source.kind === "commit" && source.headRef === commit.sha,
          )
        ) {
          const diffOpen =
            selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, resolvedThreadRef) ===
            "diff";
          useDiffPanelStore.getState().selectCommit(resolvedThreadRef, commit.sha, !diffOpen);
          useRightPanelStore.getState().open(resolvedThreadRef, "diff");
          return;
        }
        if (onCommitUnavailable) return onCommitUnavailable();
        // A popup opened after the lookup has lost the click's activation, so browsers block it.
        if (
          window.desktopBridge === undefined &&
          (browserLinkTarget !== "app" || !canOpenLinksInApp(resolvedThreadRef))
        ) {
          const toastId = toastManager.add(
            stackedThreadToast({
              type: "info",
              title: "This commit is not in the thread's workspace",
              actionProps: {
                children: "Open link",
                onClick: () => {
                  toastManager.close(toastId);
                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                },
              },
            }),
          );
          return;
        }
        return openLink(targetUrl, {
          event: { metaKey: event.metaKey, ctrlKey: event.ctrlKey, button: event.button },
          threadRef: resolvedThreadRef,
        });
      })
      .catch((error: unknown) => console.error(error));
    return true;
  };
}
