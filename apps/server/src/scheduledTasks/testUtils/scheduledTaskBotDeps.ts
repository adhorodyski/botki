import type { ServerProvider } from "@t3tools/contracts";
import type { ProviderInstance } from "@t3tools/provider-core/server/driver";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

import * as ProviderInstanceRegistry from "../../provider/ProviderInstanceRegistry.ts";

const instanceSaying = (displayName: string, briefCapable: boolean) =>
  ({
    snapshot: {
      getSnapshot: Effect.succeed({
        displayName,
        ...(briefCapable ? { supportsBotInstructions: true } : {}),
      } as ServerProvider),
    },
  }) as ProviderInstance;

/**
 * A task naming a bot asks whether its model's provider can carry a brief, so any harness that
 * builds the schedule service needs a registry. Instances named in `briefCapable` say yes; every
 * other instance reports no capability, which is also what an unknown provider reports.
 */
export const layerProviderInstances = (input: { readonly briefCapable: ReadonlyArray<string> }) => {
  const getInstance = (
    instanceId: Parameters<
      ProviderInstanceRegistry.ProviderInstanceRegistry["Service"]["getInstance"]
    >[0],
  ) => Effect.succeed(instanceSaying(String(instanceId), input.briefCapable.includes(instanceId)));
  return Layer.succeed(ProviderInstanceRegistry.ProviderInstanceRegistry, {
    getInstance,
    listInstances: Effect.succeed([]),
    listUnavailable: Effect.succeed([]),
    streamChanges: Stream.empty,
    subscribeChanges: Effect.never,
  });
};

/** For harnesses that never name a bot: no instance ever gets asked. */
export const scheduledTaskBotsWithNoBots = layerProviderInstances({ briefCapable: [] });
