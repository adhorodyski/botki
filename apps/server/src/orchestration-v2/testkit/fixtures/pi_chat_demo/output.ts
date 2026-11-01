import { assert } from "@effect/vitest";
import type { ProviderReplayTranscript } from "@t3tools/contracts";

import type { OrchestratorV2ScenarioResult } from "../../OrchestratorScenario.ts";
import {
  assertBaseProjection,
  assertConversationMessageRoles,
  assertExecutionNodeKinds,
  assertRunOrdinals,
  assertSemanticProjectionIntegrity,
  assertTurnItemTypes,
  assertUserMessagesInclude,
  assertVisibleTurnItemsMirrorLocalTurnItems,
  projectionFor,
} from "../shared.ts";
import {
  PI_CHAT_DEMO_ANSWER,
  PI_CHAT_DEMO_FIRST_PROMPT,
  PI_CHAT_DEMO_MARKER,
  PI_CHAT_DEMO_RECALL_PROMPT,
  PI_CHAT_DEMO_STORED,
} from "./input.ts";
import { assertPiSettledTokenUsage } from "../simple/pi_output.ts";

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}

/**
 * The second turn must repeat a marker only the first turn established, so a replay of this
 * scenario fails if the adapter ever stops carrying provider-side history across turns.
 */
export function assertPiChatDemoOutput(
  result: OrchestratorV2ScenarioResult,
  transcript: ProviderReplayTranscript,
) {
  assertBaseProjection({
    result,
    transcript,
    runCount: 2,
    runStatuses: ["completed", "completed"],
  });

  const projection = projectionFor(result, transcript.scenario);
  assertSemanticProjectionIntegrity(projection);
  assertVisibleTurnItemsMirrorLocalTurnItems(projection);
  assertRunOrdinals(projection, [1, 2]);
  assertExecutionNodeKinds(projection, ["root_turn", "assistant_message"]);
  assertConversationMessageRoles(projection, ["user", "assistant", "user", "assistant"]);
  assertTurnItemTypes(projection, [
    "user_message",
    "assistant_message",
    "user_message",
    "assistant_message",
  ]);
  assertUserMessagesInclude(projection, [PI_CHAT_DEMO_FIRST_PROMPT, PI_CHAT_DEMO_RECALL_PROMPT]);

  const assistantText = projection.turnItems.flatMap((item) =>
    item.type === "assistant_message" ? [item.text] : [],
  );
  assert.lengthOf(assistantText, 2, "the recording must hold one answer per turn");
  assert.include(assistantText[0], PI_CHAT_DEMO_STORED);
  assert.include(assistantText[1], PI_CHAT_DEMO_ANSWER);
  assert.include(assistantText[1], PI_CHAT_DEMO_MARKER);

  const outboundPrompts = transcript.entries
    .flatMap((entry) => (entry.type === "expect_outbound" ? [entry.frame] : []))
    .filter((frame) => field(frame, "type") === "prompt")
    .map((frame) => field(frame, "message"));
  assert.deepEqual(outboundPrompts, [PI_CHAT_DEMO_FIRST_PROMPT, PI_CHAT_DEMO_RECALL_PROMPT]);

  assertPiSettledTokenUsage(result, transcript);
}
