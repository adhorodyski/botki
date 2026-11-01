import type { OrchestratorFixtureInput } from "../shared.ts";

export const PI_CHAT_DEMO_MARKER = "botki-chat-demo-9F4K";
export const PI_CHAT_DEMO_STORED = "botki chat marker stored";
export const PI_CHAT_DEMO_ANSWER = `botki chat demo complete ${PI_CHAT_DEMO_MARKER}`;

export const PI_CHAT_DEMO_FIRST_PROMPT = `Remember the opaque marker ${PI_CHAT_DEMO_MARKER} for later. Respond with exactly: ${PI_CHAT_DEMO_STORED}`;
export const PI_CHAT_DEMO_RECALL_PROMPT = `Return the opaque marker I asked you to remember. Respond with exactly: ${PI_CHAT_DEMO_ANSWER}`;

/** The chat demo every ACCEPT runs on: two turns, and the second proves the thread kept history. */
export function piChatDemoInput(): OrchestratorFixtureInput {
  return {
    steps: [
      { type: "message", text: PI_CHAT_DEMO_FIRST_PROMPT },
      { type: "message", text: PI_CHAT_DEMO_RECALL_PROMPT },
    ],
  };
}
