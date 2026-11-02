import { assert, it } from "@effect/vitest";
import { SecretProviderId } from "@t3tools/contracts";
import * as SecretResolver from "@t3tools/secret-provider-core/server/SecretResolver";
import * as Effect from "effect/Effect";

import {
  collectSourceControlHostSecretReferences,
  invalidateSettingsSecrets,
  resolveSourceControlHostSecrets,
  SOURCE_CONTROL_HOST_SECRET_FIELDS,
} from "./sourceControlHostSecrets.ts";

const source = (reference: string) => ({
  provider: SecretProviderId.make("homelab"),
  reference,
});

/** Saved credentials from releases that registered hosts; the fork registers none. */
const hosts = {
  bitbucket: { email: "me@example.test", accessToken: source("bitbucket#token") },
  github: { tokens: { "github.com": "ghp_literal" } },
};

function countingResolver() {
  const reads: Array<string> = [];
  const resolver = SecretResolver.SecretResolver.of({
    read: (references) =>
      Effect.sync(() =>
        references.map((reference) => {
          reads.push(reference.reference);
          return undefined;
        }),
      ),
    invalidate: (references) =>
      Effect.sync(() => reads.push(...(references ?? []).map((r) => r.reference))),
  });
  return { reads, resolver };
}

it("registers no host credential fields, so nothing is read from the secret store", () => {
  assert.deepEqual([...SOURCE_CONTROL_HOST_SECRET_FIELDS], []);
  assert.deepEqual(collectSourceControlHostSecretReferences(hosts), []);
});

it.effect("leaves saved host credentials untouched and the resolver unused", () =>
  Effect.gen(function* () {
    const { reads, resolver } = countingResolver();
    for (const kind of ["bitbucket", "github", "gitcafe"]) {
      assert.strictEqual(yield* resolveSourceControlHostSecrets(resolver, hosts, kind), hosts);
    }
    assert.deepEqual(reads, []);
  }),
);

it.effect("invalidates nothing when settings hold no known host credentials", () =>
  Effect.gen(function* () {
    const { reads, resolver } = countingResolver();
    yield* invalidateSettingsSecrets(resolver, Effect.succeed({ sourceControlHosts: hosts }));
    assert.deepEqual(reads, []);
  }),
);

it.effect(
  "passes no reference list when settings cannot be read, which clears every cached secret",
  () =>
    Effect.gen(function* () {
      let cleared: ReadonlyArray<{ readonly reference: string }> | undefined;
      const resolver = SecretResolver.SecretResolver.of({
        read: () => Effect.succeed([]),
        invalidate: (references) => Effect.sync(() => (cleared = references)),
      });
      yield* invalidateSettingsSecrets(resolver, Effect.fail("settings unreadable"));
      assert.strictEqual(cleared, undefined);
    }),
);
