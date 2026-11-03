import { type Bot, type BotMutation, type EnvironmentId, WS_METHODS } from "@t3tools/contracts";
import {
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
  runAtomCommand,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { connectionAtomRuntime } from "../connection/runtime";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { useEnvironmentQuery } from "./query";

// A handful of rows the server keeps in memory: a short staleness window picks up a bot another
// window just added, without a subscription of its own.
export const botsList = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:bots:list",
  tag: WS_METHODS.botsList,
  staleTimeMs: 10_000,
});

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
