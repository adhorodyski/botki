import { type Bot, BotId, EnvironmentId } from "@t3tools/contracts";
import { page } from "vite-plus/test/browser";
import { describe, expect, it, vi } from "vite-plus/test";

import { act, render } from "../../../test/render";

const botsStore = vi.hoisted(() => {
  let list: readonly unknown[] = [];
  const listeners = new Set<() => void>();
  return {
    set: (next: readonly unknown[]) => {
      list = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => list,
  };
});

const mutateBots = vi.hoisted(() => vi.fn());
const refreshes = vi.hoisted(() => ({ count: 0 }));

vi.mock(import("../../state/bots"), async (original) => {
  const { useSyncExternalStore } = await import("react");
  return {
    ...(await original()),
    mutateBots: mutateBots as never,
    useBots: (() => ({
      bots: useSyncExternalStore(botsStore.subscribe, botsStore.get),
      isPending: false,
      refresh: () => {
        refreshes.count += 1;
      },
    })) as never,
  };
});

import { SidebarTeamSection } from "./SidebarTeamSection";

const ENVIRONMENT_ID = EnvironmentId.make("team-environment");

function bot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: BotId.make("viki"),
    name: "Viki",
    role: "proofreader",
    brief: "You fix grammar. Reply ONLY with the corrected text.",
    providerInstanceId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const VIKI = bot();

/**
 * Dialog popups sit under a backdrop that intercepts synthetic pointer events, so submits go
 * through the form itself. Same approach as projectScriptEditor's browser test.
 */
async function submitDialog() {
  await act(async () => {
    document.querySelector("form")?.requestSubmit();
  });
}

/** The same interception applies to overlay buttons that are not form submissions. */
async function clickByLabel(label: string) {
  await act(async () => {
    for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("button"))) {
      if (button.textContent?.trim() === label) button.click();
    }
  });
}

describe("SidebarTeamSection", () => {
  it("opens a bot's thread and carries the id to the draft", async () => {
    botsStore.set([VIKI, bot({ id: BotId.make("repo-bot"), name: "Repo Bot", role: "runner" })]);
    const onOpenBot = vi.fn();
    await using screen = await render(
      <SidebarTeamSection environmentId={ENVIRONMENT_ID} onOpenBot={onOpenBot} />,
    );

    await expect.element(screen.getByTestId("sidebar-bot-viki")).toBeInTheDocument();
    await expect.element(screen.getByTestId("sidebar-bot-repo-bot")).toBeInTheDocument();

    await screen.getByTestId("sidebar-bot-viki").click();
    expect(onOpenBot).toHaveBeenCalledWith("viki");
  });

  it("edits a brief from its stored value and re-reads the list", async () => {
    botsStore.set([VIKI]);
    mutateBots.mockResolvedValue({ bot: bot({ brief: "Reply in one clause." }), error: null });
    await using screen = await render(
      <SidebarTeamSection environmentId={ENVIRONMENT_ID} onOpenBot={vi.fn()} />,
    );

    await screen.getByTestId("sidebar-bot-viki-edit").click();
    // Starting from an empty box would silently blank the brief the slice keeps in
    // sync with bots/viki/BRIEF.md, so the stored text must be in the field.
    await expect
      .element(page.getByRole("textbox", { name: "Brief" }))
      .toHaveValue("You fix grammar. Reply ONLY with the corrected text.");

    await page.getByRole("textbox", { name: "Brief" }).fill("Reply in one clause.");
    await submitDialog();

    await expect
      .poll(() => mutateBots.mock.lastCall?.[1])
      .toMatchObject({ type: "bot.update", id: "viki", brief: "Reply in one clause." });
    await expect.poll(() => refreshes.count).toBe(1);
    await expect.element(page.getByRole("textbox", { name: "Brief" })).not.toBeInTheDocument();
  });

  it("warns that deleting leaves the bot's folder on disk", async () => {
    botsStore.set([VIKI]);
    mutateBots.mockResolvedValue({ bot: null, error: null });
    await using screen = await render(
      <SidebarTeamSection environmentId={ENVIRONMENT_ID} onOpenBot={vi.fn()} />,
    );

    await screen.getByTestId("sidebar-bot-viki-edit").click();
    await clickByLabel("Delete");
    await expect.element(page.getByText(/bots\/viki\/ stays on disk/)).toBeInTheDocument();

    await clickByLabel("Delete bot");
    await expect
      .poll(() => mutateBots.mock.lastCall?.[1])
      .toMatchObject({
        type: "bot.delete",
        id: "viki",
      });
  });

  it("shows a rejected create inline instead of closing the dialog", async () => {
    botsStore.set([]);
    mutateBots.mockResolvedValue({ bot: null, error: "A bot named 'viki' already exists." });
    await using screen = await render(
      <SidebarTeamSection environmentId={ENVIRONMENT_ID} onOpenBot={vi.fn()} />,
    );

    await screen.getByRole("button", { name: "Add bot" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Viki");
    await page.getByRole("textbox", { name: "Role" }).fill("proofreader");
    await submitDialog();

    await expect.element(page.getByText("A bot named 'viki' already exists.")).toBeInTheDocument();
    await expect.element(page.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(mutateBots.mock.lastCall?.[1]).toMatchObject({
      type: "bot.create",
      name: "Viki",
      role: "proofreader",
    });
  });
});
