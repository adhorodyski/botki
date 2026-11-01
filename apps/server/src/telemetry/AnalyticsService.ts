/**
 * Upstream posted these events to t3's ingest endpoint; a self-hosted install has
 * nobody to report to, so every event drops here. Local `observability/` stays real.
 *
 * @module telemetry/AnalyticsService
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { TelemetryOwner } from "./Identify.ts";

export class AnalyticsService extends Context.Service<
  AnalyticsService,
  {
    readonly record: (
      event: string,
      properties?: Readonly<Record<string, unknown>>,
    ) => Effect.Effect<void>;

    readonly flush: Effect.Effect<void>;

    /**
     * Kept so the server and every connecting client report through one seam.
     */
    readonly recordOwners: (
      owners: ReadonlyArray<TelemetryOwner>,
      observedBy: "server" | "client",
    ) => Effect.Effect<void>;
  }
>()("t3/telemetry/AnalyticsService") {}

const record = Effect.fn("AnalyticsService.record")(function () {
  return Effect.void;
});

const recordOwners = Effect.fn("AnalyticsService.recordOwners")(function () {
  return Effect.void;
});

/** @public */
export const layer = Layer.succeed(
  AnalyticsService,
  AnalyticsService.of({
    record,
    flush: Effect.void,
    recordOwners,
  }),
);
