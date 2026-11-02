import { expect, it } from "@effect/vitest";

import {
  BUILT_IN_SOURCE_CONTROL_DRIVER_LIST,
  sourceControlDefinitions,
} from "./sourceControlDefinitions.ts";

it("runs a driver for every host the server and clients read, in their order", () => {
  expect(BUILT_IN_SOURCE_CONTROL_DRIVER_LIST.map((driver) => driver.definition)).toEqual(
    sourceControlDefinitions.definitions,
  );
});

it("reads no forge: neither side claims a host, so a saved one resolves as unknown", () => {
  expect(BUILT_IN_SOURCE_CONTROL_DRIVER_LIST).toEqual([]);
  expect(sourceControlDefinitions.definitions).toEqual([]);
  expect(
    sourceControlDefinitions.parseChangeRequestUrl("https://github.com/o/r/pull/1"),
  ).toBeNull();
  expect(sourceControlDefinitions.canonicalRepositoryKey("github.com/owner/repo")).toBe(
    "github.com/owner/repo",
  );
});
