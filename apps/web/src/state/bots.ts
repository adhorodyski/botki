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
