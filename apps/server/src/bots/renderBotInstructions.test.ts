import { assert, it } from "@effect/vitest";
import { BotId } from "@t3tools/contracts";
import {
  botRelativeDirectory,
  briefRelativePath,
  instructionsRelativePath,
  renderBrief,
  renderBotInstructions,
} from "./renderBotInstructions.ts";

const viki = {
  id: BotId.make("viki"),
  name: "Viki",
  role: "proofreader",
  brief: "You fix grammar. Reply ONLY with the corrected text. Never explain.",
};

it("renders the brief verbatim with a trailing newline", () => {
  assert.equal(
    renderBrief(viki),
    "You fix grammar. Reply ONLY with the corrected text. Never explain.\n",
  );
});

it("trims the brief rather than reflowing it", () => {
  assert.equal(
    renderBrief({ ...viki, brief: "  Keep   my   spacing  \n\n" }),
    "Keep   my   spacing\n",
  );
});

it("renders the exact preamble a bot turn carries", () => {
  assert.equal(
    renderBotInstructions(viki),
    [
      "<botki_bot_instructions>",
      'You are the "Viki" bot (proofreader). Your brief lives in bots/viki/BRIEF.md and applies to every turn of this thread.',
      "You fix grammar. Reply ONLY with the corrected text. Never explain.",
      "</botki_bot_instructions>",
    ].join("\n"),
  );
});

it("keeps the identity header out of the canonical brief", () => {
  // Editing BRIEF.md by hand and editing the form must produce the same bytes, so the header
  // the model sees can never leak into the file the owner owns.
  const brief = renderBrief(viki);
  assert.notInclude(brief, "botki_bot_instructions");
  assert.notInclude(brief, "You are the");
});

it("names the folder after the id, not the name", () => {
  const renamed = { ...viki, name: "Viki the Proofreader" };
  assert.equal(botRelativeDirectory(renamed.id), "bots/viki");
  assert.equal(briefRelativePath(renamed.id), "bots/viki/BRIEF.md");
  assert.equal(instructionsRelativePath(renamed.id), "bot-instructions/viki.md");
});
