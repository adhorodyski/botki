import { ManagedRelay } from "@t3tools/client-runtime/relay";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

const noRelay = new Error("No relay is configured in this build.");

/**
 * Botki has no relay, but the shared connection layer builds environment
 * discovery and DPoP authorization around these two services. Every call fails
 * here, so discovery finds nothing to connect and an authorization that cannot
 * exist fails loudly instead of signing silently.
 */
const requestFailed = (action: ManagedRelay.ManagedRelayRequestAction) =>
  Effect.fn(`ManagedRelay.ManagedRelayClient.${action}` as const)(function* () {
    return yield* new ManagedRelay.ManagedRelayRequestFailedError({ action, cause: noRelay });
  });

export const layer = Layer.mergeAll(
  Layer.succeed(
    ManagedRelay.ManagedRelayClient,
    ManagedRelay.ManagedRelayClient.of({
      relayUrl: "http://relay.invalid",
      listEnvironments: requestFailed("list relay-managed environments"),
      listDevices: requestFailed("list relay client devices"),
      createEnvironmentLinkChallenge: requestFailed("create relay environment link challenge"),
      linkEnvironment: requestFailed("link relay environment"),
      unlinkEnvironment: requestFailed("unlink relay environment"),
      getT3ChatLink: requestFailed("read linked T3 Chat account"),
      createT3ChatLinkRequest: requestFailed("start T3 Chat linking"),
      unlinkT3Chat: requestFailed("unlink T3 Chat account"),
      getEnvironmentStatus: requestFailed("get relay environment status"),
      connectEnvironment: requestFailed("connect relay environment"),
      registerDevice: requestFailed("register relay mobile device"),
      unregisterDevice: requestFailed("unregister relay mobile device"),
      registerLiveActivity: requestFailed("register relay live activity"),
      getAgentActivitySnapshot: requestFailed("read relay agent activity snapshot"),
      resetTokenCache: Effect.void,
    }),
  ),
  Layer.succeed(
    ManagedRelay.ManagedRelayDpopSigner,
    ManagedRelay.ManagedRelayDpopSigner.of({
      thumbprint: Effect.suspend(
        () =>
          new ManagedRelay.ManagedRelayDpopKeyLoadError({
            keyStore: "indexed-db",
            cause: noRelay,
          }),
      ),
      createProof: Effect.fn("ManagedRelay.ManagedRelayDpopSigner.createProof")(function* (
        input: ManagedRelay.ManagedRelayDpopProofInput,
      ) {
        return yield* new ManagedRelay.ManagedRelayDpopProofCreationError({
          method: input.method,
          url: input.url,
          cause: noRelay,
        });
      }),
    }),
  ),
);
