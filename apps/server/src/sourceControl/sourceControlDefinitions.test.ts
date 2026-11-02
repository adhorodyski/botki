import { expect, it } from "@effect/vitest";

import {
  BUILT_IN_SOURCE_CONTROL_DRIVER_LIST,
  sourceControlDefinitions,
} from "./sourceControlDefinitions.ts";

it("drives no host, so nothing is probed, listed, or signed in to", () => {
  expect(BUILT_IN_SOURCE_CONTROL_DRIVER_LIST).toEqual([]);
});

it("still reads the hosts that saved history and remotes name", () => {
  expect(
    sourceControlDefinitions.parseChangeRequestUrl("https://github.com/o/r/pull/1")?.link,
  ).toMatchObject({ repository: "o/r", number: 1 });
  expect(sourceControlDefinitions.repositoryKeyFromRemote("git@github.com:Owner/Repo.git")).toBe(
    "github.com/owner/repo",
  );
  expect(sourceControlDefinitions.recognizeRemote("https://gitlab.com/g/r.git")?.kind).toBe(
    "gitlab",
  );
});
