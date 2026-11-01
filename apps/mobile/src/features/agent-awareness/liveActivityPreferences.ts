import * as Effect from "effect/Effect";

import { updateAgentAwarenessRegistrationPreferences } from "./remoteRegistration";

/**
 * Live Activity delivery rode T3 Connect's relay, so this only settles the
 * device-side registration.
 */
export const setLiveActivityUpdatesEnabled = Effect.fn("setLiveActivityUpdatesEnabled")(
  function* (input: { readonly enabled: boolean; readonly previousEnabled: boolean }) {
    yield* updateAgentAwarenessRegistrationPreferences({
      liveActivitiesEnabled: input.enabled,
    }).pipe(
      Effect.onError(() =>
        updateAgentAwarenessRegistrationPreferences({
          liveActivitiesEnabled: input.previousEnabled,
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("Could not restore Live Activity device preference.", cause),
          ),
        ),
      ),
    );
  },
);
