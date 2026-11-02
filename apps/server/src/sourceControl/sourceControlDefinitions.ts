import type { SourceControlDriver } from "@t3tools/source-control-core/server/driver";

/**
 * The fork talks to no forge, so there is no host to probe, list, or sign in to. The definition
 * registry stays populated: reading a remote URL and naming a host are not forge access, and
 * project identity and saved thread links depend on them.
 */
export const BUILT_IN_SOURCE_CONTROL_DRIVER_LIST: ReadonlyArray<SourceControlDriver> = [];

export { builtInSourceControlDefinitions as sourceControlDefinitions } from "@t3tools/source-control-definitions/registry";
