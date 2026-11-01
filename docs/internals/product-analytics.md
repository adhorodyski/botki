# Product analytics

Botki ships no analytics destination. [AnalyticsService](../../apps/server/src/telemetry/AnalyticsService.ts)
keeps the upstream interface and drops every event, so a self-hosted install never phones home and
call sites do not need conditional logic.

The identity and dimension modules stay intact —
[Identify](../../apps/server/src/telemetry/Identify.ts),
[FeatureUsage](../../apps/server/src/telemetry/FeatureUsage.ts), and
[ProviderDimensions](../../apps/server/src/telemetry/ProviderDimensions.ts) — because the sink is the
one cut point: keeping them means upstream fixes to telemetry call sites keep cherry-picking cleanly.
Do not spread "is telemetry enabled" checks through the server; if a destination ever returns, it goes
in the sink.

The collection boundary still holds for anything written to the sink or to local observability:
product metadata and normalized measurements only. No prompts, authentication material, raw provider
payloads, user-assigned device names, or conversation identifiers. Agent tool events report driver
kinds, never instance ids, and a model is named only when it is a non-custom entry in a vendor
catalog.
