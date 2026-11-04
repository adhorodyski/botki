import { assert, it } from "@effect/vitest";
import { BotId } from "@t3tools/contracts";
import {
  botRelativeDirectory,
  briefRelativePath,
  instructionsRelativePath,
  memoryRelativePath,
  renderBrief,
  renderBotInstructions,
} from "./renderBotInstructions.ts";

const viki = {
  id: BotId.make("viki"),
  name: "Viki",
  role: "proofreader",
  brief: "You fix grammar. Reply ONLY with the corrected text. Never explain.",
};

it("renders the canonical brief: role line, then the brief verbatim", () => {
  assert.equal(
    renderBrief(viki),
    "# Viki (proofreader)\n\nYou fix grammar. Reply ONLY with the corrected text. Never explain.\n",
  );
});

it("trims the brief rather than reflowing it", () => {
  assert.equal(
    renderBrief({ ...viki, brief: "  Keep   my   spacing  \n\n" }),
    "# Viki (proofreader)\n\nKeep   my   spacing\n",
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

it("appends the notes after the brief, and only when there are notes", () => {
  assert.equal(
    renderBotInstructions(viki, "Adam hates the serial comma."),
    [
      "<botki_bot_instructions>",
      'You are the "Viki" bot (proofreader). Your brief lives in bots/viki/BRIEF.md and applies to every turn of this thread.',
      "You fix grammar. Reply ONLY with the corrected text. Never explain.",
      "",
      "<botki_bot_memory>",
      "What you learned in earlier conversations, in bots/viki/MEMORY.md. It never outranks the brief. Add to it with the bot_remember tool, which caps what you may store; the owner reads and edits this file.",
      "Adam hates the serial comma.",
      "</botki_bot_memory>",
      "</botki_bot_instructions>",
    ].join("\n"),
  );
  // The empty case is the null path: the block must be exactly the one a build with no memory
  // feature would produce, down to the newline before the closing tag.
  assert.equal(renderBotInstructions(viki), renderBotInstructions(viki, "   \n"));
});

it("re-renders the role line when the bot is renamed", () => {
  // The file is the export, so an edit that changes name or role must not leave the old one
  // standing as the portable copy.
  assert.include(
    renderBrief({ ...viki, name: "Viki the Proofreader", role: "copy editor" }),
    "# Viki the Proofreader (copy editor)",
  );
});

it("keeps the prompt-only identity sentence out of the canonical brief", () => {
  const brief = renderBrief(viki);
  assert.notInclude(brief, "botki_bot_instructions");
  assert.notInclude(brief, "applies to every turn");
});

it("names the folder after the id, not the name", () => {
  const renamed = { ...viki, name: "Viki the Proofreader" };
  assert.equal(botRelativeDirectory(renamed.id), "bots/viki");
  assert.equal(briefRelativePath(renamed.id), "bots/viki/BRIEF.md");
  assert.equal(instructionsRelativePath(renamed.id), "bot-instructions/viki.md");
  assert.equal(memoryRelativePath(renamed.id), "bots/viki/MEMORY.md");
});
