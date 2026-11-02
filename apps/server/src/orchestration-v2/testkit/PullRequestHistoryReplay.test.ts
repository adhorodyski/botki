import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  OrchestrationV2DomainEventJson,
  ThreadId,
  type OrchestrationV2DomainEvent,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as SqlitePersistence from "../../persistence/Sqlite.ts";
import * as EventStore from "../EventStore.ts";
import * as ProjectionMaintenance from "../ProjectionMaintenance.ts";
import * as ProjectionStore from "../ProjectionStore.ts";

/**
 * Two threads' durable streams captured from a live database before the pull request surface was
 * cut, with account, repository, and host names scrubbed. They fold 48
 * `thread.pull-request-link-updated` events, so replaying them proves the rows already sitting in
 * someone's database still decode.
 */
const CAPTURED_STREAM = new URL(
  "./fixtures/pull_request_history/thread_events.ndjson",
  import.meta.url,
);

const decodeCaptured = Schema.decodeUnknownEffect(OrchestrationV2DomainEventJson);

class CapturedHistoryUndecodable extends Schema.TaggedError<CapturedHistoryUndecodable>()(
  "CapturedHistoryUndecodable",
  { index: Schema.Number, line: Schema.String },
) {}

const readCapturedEvents = Effect.fn("readCapturedPullRequestHistory")(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(yield* path.fromFileUrl(CAPTURED_STREAM));
  return yield* Effect.forEach(
    text.split("\n").filter((line) => line.length > 0),
    (line, index) =>
      decodeCaptured(JSON.parse(line)).pipe(
        Effect.mapError(() => new CapturedHistoryUndecodable({ index, line: line.slice(0, 200) })),
      ),
  );
});

const layerTest = Layer.mergeAll(
  EventStore.layer,
  ProjectionStore.layer,
  ProjectionMaintenance.layer.pipe(
    Layer.provide(Layer.merge(EventStore.layer, ProjectionStore.layer)),
  ),
).pipe(Layer.provideMerge(SqlitePersistence.layerMemory), Layer.provideMerge(NodeServices.layer));

/** Append the capture, then rebuild: the fold the server runs when it recovers on boot. */
const replayCapturedStream = Effect.fn("replayCapturedPullRequestStream")(function* () {
  const eventStore = yield* EventStore.EventStoreV2;
  const projections = yield* ProjectionStore.ProjectionStoreV2;
  const maintenance = yield* ProjectionMaintenance.ProjectionMaintenanceV2;
  const events = yield* readCapturedEvents();
  yield* eventStore.append({ events });
  const verification = yield* maintenance.rebuild;
  return { events, projections, verification };
});

it.effect("replay folds captured pull request history without a projection error", () =>
  Effect.gen(function* () {
    const { events, projections, verification } = yield* replayCapturedStream();
    assert.isAtLeast(
      events.filter((event) => event.type === "thread.pull-request-link-updated").length,
      40,
    );
    assert.isTrue(verification.valid);
    assert.deepEqual(verification.unreadableThreadIds, []);
    assert.deepEqual(verification.missingThreadIds, []);
    assert.deepEqual(verification.unexpectedThreadIds, []);

    const threads = (yield* projections.getShellSnapshot()).threads;
    const capturedThreadIds = [
      ThreadId.make("thread:captured-queue-logging"),
      ThreadId.make("thread:captured-retry-guard"),
    ];
    assert.deepEqual(threads.map((thread) => thread.id).toSorted(), capturedThreadIds.toSorted());
    // Nothing left can end a pull request watch, so a stale one must not hold these open.
    for (const thread of threads) {
      assert.deepEqual(thread.pendingBackgroundTasks, []);
    }
    // The threads stay settlement candidates rather than sitting in Working forever.
    assert.deepEqual(
      (yield* projections.getSettlementCandidates()).map((thread) => thread.id).toSorted(),
      capturedThreadIds.toSorted(),
    );
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("a captured pull request snapshot folds without touching the thread", () =>
  Effect.gen(function* () {
    const { events, projections } = yield* replayCapturedStream();
    const created = events.find((event) => event.type === "thread.created")!;
    const refreshed = events.find(
      (event) =>
        event.type === "thread.pull-request-link-updated" &&
        event.threadId === created.threadId &&
        event.payload.snapshot !== null,
    );
    assert.isNotNull(refreshed ?? null);

    const before = yield* projections.getThread(created.threadId);
    yield* projections.apply(refreshed as OrchestrationV2DomainEvent);
    const after = yield* projections.getThread(created.threadId);

    assert.deepEqual(after.pullRequests ?? [], before.pullRequests ?? []);
    assert.deepEqual(DateTime.formatIso(after.updatedAt), DateTime.formatIso(before.updatedAt));
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);
