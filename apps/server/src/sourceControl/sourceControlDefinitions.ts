import type { SourceControlDriver } from "@t3tools/source-control-core/server/driver";

/** No built-in hosts: the fork talks to no forge, so nothing is probed, listed, or signed in to. */
export const BUILT_IN_SOURCE_CONTROL_DRIVER_LIST: ReadonlyArray<SourceControlDriver> = [];

export { builtInSourceControlDefinitions as sourceControlDefinitions } from "@t3tools/source-control-definitions/registry";
