import { type Bot, type EnvironmentId, botIdFromName } from "@t3tools/contracts";
import { useId, useState } from "react";

import { mutateBots, saveBotMemory, useBotMemory } from "../state/bots";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface BotDialogProps {
  readonly environmentId: EnvironmentId;
  /** Null opens the create form; a bot opens the same form prefilled. */
  readonly bot: Bot | null;
  /** Runs after any saved mutation or a delete, so the settings list re-reads. */
  readonly onSettled: () => void;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * The one bot form: create and edit share it, matching the issue's "reuse the same dialog".
 * Deleting confirms separately because the bot's folder on disk is left in place.
 */
export function BotDialog({ environmentId, bot, onSettled, onOpenChange }: BotDialogProps) {
  const id = useId();
  const {
    memory: storedMemory,
    maxChars,
    isPending: memoryPending,
    refresh: refreshMemory,
  } = useBotMemory(environmentId, bot?.id ?? null);
  const [name, setName] = useState(bot?.name ?? "");
  const [role, setRole] = useState(bot?.role ?? "");
  const [brief, setBrief] = useState(bot?.brief ?? "");
  // Null until the owner touches the field, so an unread file can never be saved back as empty.
  const [memoryEdit, setMemoryEdit] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const trimmedName = name.trim();
  const trimmedRole = role.trim();
  const canSave = trimmedName.length > 0 && trimmedRole.length > 0 && !submitting;
  const memory = memoryEdit ?? storedMemory;
  const memoryChanged = memoryEdit !== null && memoryEdit.trim() !== storedMemory;

  // The server derives the id from the name when none is sent, so a rename keeps one bot's folder
  // and its brief path stable rather than opening a second one.
  const submit = async () => {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    const result = await mutateBots(
      environmentId,
      bot
        ? {
            type: "bot.update",
            id: bot.id,
            name: trimmedName,
            role: trimmedRole,
            brief: brief.trim(),
          }
        : {
            type: "bot.create",
            name: trimmedName,
            role: trimmedRole,
            brief: brief.trim(),
          },
    );
    // Memory is saved second and only if the row is safe: a bot that failed to save has no
    // turn to carry notes, and the cap reason is the owner's to read, not to lose.
    const saved =
      result.error === null && bot !== null && memoryChanged
        ? await saveBotMemory(environmentId, bot.id, memory)
        : null;
    setSubmitting(false);
    const failure = result.error ?? saved?.error ?? null;
    if (failure !== null) {
      setError(failure);
      return;
    }
    // The row's "Knows:" line reads this same atom, so one refresh settles both.
    if (saved !== null) refreshMemory();
    onSettled();
    onOpenChange(false);
  };

  const remove = async () => {
    if (bot === null) return;
    setConfirmingDelete(false);
    const result = await mutateBots(environmentId, { type: "bot.delete", id: bot.id });
    if (result.error !== null) {
      setError(result.error);
      return;
    }
    onSettled();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogPopup className="sm:max-w-md">
          <form
            className="flex min-h-0 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <DialogHeader>
              <DialogTitle>{bot ? `Edit ${bot.name}` : "Add bot"}</DialogTitle>
              <DialogDescription>
                A bot is a name, a role, and a brief. Every chat you start with it answers according
                to that brief.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-name`}>Name</Label>
                <Input
                  id={`${id}-name`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Viki"
                  autoFocus
                />
                {!bot && trimmedName.length > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Folder: bots/{botIdFromName(trimmedName) || "…"}/BRIEF.md
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-role`}>Role</Label>
                <Input
                  id={`${id}-role`}
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="proofreader"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-brief`}>Brief</Label>
                <Textarea
                  id={`${id}-brief`}
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  rows={5}
                  placeholder="You fix grammar. Reply ONLY with the corrected text. Never explain."
                />
                <p className="text-muted-foreground text-xs">
                  Sent to the model on every turn of the bot&rsquo;s threads.
                </p>
              </div>

              {bot ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-memory`}>What it knows</Label>
                  <Textarea
                    id={`${id}-memory`}
                    // The bot wrote these itself. Editing here is the owner having the last word,
                    // and emptying the field is how they make the bot forget.
                    value={memory}
                    onChange={(event) => setMemoryEdit(event.target.value)}
                    disabled={memoryPending}
                    rows={5}
                    placeholder={
                      memoryPending
                        ? "Loading…"
                        : "Nothing yet. A bot adds to this when it learns something worth keeping."
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    What the bot learned in earlier chats, and reaches its later ones. Empty it to
                    make the bot forget. {memory.length} of {maxChars}.
                  </p>
                </div>
              ) : null}

              {error ? <p className="text-destructive-foreground text-sm">{error}</p> : null}
            </DialogPanel>
            <DialogFooter>
              {bot ? (
                <Button
                  type="button"
                  variant="ghost-destructive"
                  className="me-auto"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSave}>
                {submitting ? "Saving…" : bot ? "Save" : "Create bot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      {bot ? (
        <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <AlertDialogBackdrop />
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Removes the bot and stops its brief from reaching new turns. Its existing threads
                stay, and its folder at bots/{bot.id}/ stays on disk with its notes and any files it
                left behind.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void remove()}>
                Delete bot
              </Button>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      ) : null}
    </>
  );
}
