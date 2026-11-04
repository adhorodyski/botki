import {
  type Bot,
  type BotId,
  type BotMutation,
  type EnvironmentId,
  WS_METHODS,
} from "@t3tools/contracts";
import { Atom, AsyncResult } from "effect/reactivity";
import {
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
  runAtomCommand,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { connectionAtomRuntime } from "../connection/runtime";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { environmentPresentations } from "./presentation";
import { useEnvironmentQuery } from "./query";

// A handful of rows the server keeps in memory: a short staleness window picks up a bot another
// window just added, without a subscription of its own.
const botsList = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:bots:list",
  tag: WS_METHODS.botsList,
  staleTimeMs: 10_000,
});

export interface ChatBot {
  readonly botId: BotId;
  readonly name: string;
  readonly role: string;
}

// A chat is named for its bot wherever a chat pane would otherwise name a project, so every
// surface that shows a bot's chat reads the team from here.
export const botsByEnvironmentAtom = Atom.make((get) => {
  const byKey = new Map<string, ChatBot>();
  const listed: ChatBot[] = [];
  for (const [environmentId] of get(environmentPresentations.serverConfigsAtom)) {
    const result = get(botsList({ environmentId, input: {} }));
    for (const bot of AsyncResult.getOrElse(result, () => null)?.bots ?? []) {
      const entry = { botId: bot.id, name: bot.name, role: bot.role };
      byKey.set(`${environmentId}:${bot.id}`, entry);
      listed.push(entry);
    }
  }
  return { byKey, listed: listed.toSorted((a, b) => a.name.localeCompare(b.name)) };
}).pipe(Atom.withLabel("bots-by-environment"));

/** The bot a thread belongs to, or null for a plain thread, which stays project-shaped. */
export function botForThread(
  bots: { readonly byKey: ReadonlyMap<string, ChatBot> },
  thread: { readonly environmentId: EnvironmentId; readonly botId?: BotId | null },
): ChatBot | null {
  return thread.botId === undefined || thread.botId === null
    ? null
    : (bots.byKey.get(`${thread.environmentId}:${thread.botId}`) ?? null);
}

const botsMutate = createEnvironmentRpcCommand(connectionAtomRuntime, {
  label: "environment-data:bots:mutate",
  tag: WS_METHODS.botsMutate,
});

export interface BotMutationResult {
  readonly bot: Bot | null;
  readonly error: string | null;
}

/** Runs one bot mutation, returning its failure as text so the dialog can show it inline. */
export async function mutateBots(
  environmentId: EnvironmentId,
  input: BotMutation,
): Promise<BotMutationResult> {
  const result = await runAtomCommand(
    appAtomRegistry,
    botsMutate,
    { environmentId, input },
    { label: "Save bot", reportFailure: false },
  );
  if (result._tag === "Success") return { bot: result.value, error: null };
  const error = squashAtomCommandFailure(result);
  return {
    bot: null,
    error: error instanceof Error ? error.message : "Could not save the bot.",
  };
}

// Memory is a file the bot may have appended to a moment ago, so it is re-read on opening
// rather than trusted from the last time the screen was up.
const botMemory = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:bots:memory",
  tag: WS_METHODS.botsReadMemory,
  staleTimeMs: 0,
});

const botsSaveMemory = createEnvironmentRpcCommand(connectionAtomRuntime, {
  label: "environment-data:bots:saveMemory",
  tag: WS_METHODS.botsSaveMemory,
});

export interface BotMemoryView {
  readonly memory: string;
  readonly maxChars: number;
}

export interface BotMemorySaveResult extends BotMemoryView {
  readonly error: string | null;
}

/** What one bot has learned, plus its cap. Pass null until a server is connected. */
export function useBotMemory(
  environmentId: EnvironmentId | null,
  botId: BotId | null,
): {
  readonly memory: string;
  readonly maxChars: number;
  readonly isPending: boolean;
  readonly refresh: () => void;
} {
  const query = useEnvironmentQuery(
    environmentId === null || botId === null
      ? null
      : botMemory({ environmentId, input: { id: botId } }),
  );
  return {
    memory: query.data?.memory ?? "",
    maxChars: query.data?.maxChars ?? 0,
    isPending: query.isPending,
    refresh: query.refresh,
  };
}

/** Replaces a bot's memory. The server refuses past the cap, and the reason comes back as text. */
export async function saveBotMemory(
  environmentId: EnvironmentId,
  botId: BotId,
  memory: string,
): Promise<BotMemorySaveResult> {
  const result = await runAtomCommand(
    appAtomRegistry,
    botsSaveMemory,
    { environmentId, input: { id: botId, memory } },
    { label: "Save memory", reportFailure: false },
  );
  if (result._tag === "Success") return { ...result.value, error: null };
  const error = squashAtomCommandFailure(result);
  return {
    memory,
    maxChars: 0,
    error: error instanceof Error ? error.message : "Could not save the bot's memory.",
  };
}

/** The bots configured on one environment. Pass null until a server is connected. */
export function useBots(environmentId: EnvironmentId | null) {
  const query = useEnvironmentQuery(
    environmentId === null ? null : botsList({ environmentId, input: {} }),
  );
  return {
    bots: query.data?.bots ?? [],
    isPending: query.isPending,
    // A mutation lands in the server's own cache, so re-reading the query is enough to show it.
    refresh: query.refresh,
  };
}
