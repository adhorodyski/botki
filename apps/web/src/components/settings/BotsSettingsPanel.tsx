import { type Bot } from "@t3tools/contracts";
import { UserRoundIcon } from "lucide-react";
import { useState } from "react";

import { BotDialog } from "../BotDialog";
import { Button } from "../ui/button";
import { useBots, useBotMemory } from "../../state/bots";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";
import { Spinner } from "~/components/ui/spinner";

/**
 * One bot's row, in its own component so its memory read is a hook of its own. The notes are
 * shown here rather than only inside the dialog: memory the owner has to open something to see
 * is memory they will not read.
 */
function BotRow({
  bot,
  environmentId,
  onEdit,
}: {
  readonly bot: Bot;
  readonly environmentId: Parameters<typeof useBotMemory>[0];
  readonly onEdit: () => void;
}) {
  const { memory } = useBotMemory(environmentId, bot.id);
  return (
    <SettingsRow
      title={bot.name}
      description={bot.brief.trim() || bot.role}
      status={<span className="text-muted-foreground text-sm">{bot.role}</span>}
      control={
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid={`settings-bot-${bot.id}-edit`}
          onClick={onEdit}
        >
          Edit
        </Button>
      }
    >
      {memory === "" ? null : (
        <p className="max-w-2xl pt-1 text-xs leading-normal break-words text-muted-foreground">
          Knows: {memory}
        </p>
      )}
    </SettingsRow>
  );
}

/**
 * Bots live here rather than in the sidebar: the list is conversations, and a bot you have
 * never messaged is not a conversation. Deleting leaves the bot's folder and threads alone.
 */
export function BotsSettingsPanel() {
  const environmentId = usePrimaryEnvironmentId();
  const { bots, isPending, refresh } = useBots(environmentId);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Bot | null>(null);

  return (
    <SettingsPageContainer>
      <SettingsSection
        title="Bots"
        icon={<UserRoundIcon className="size-4" aria-hidden />}
        headerAction={
          <Button
            type="button"
            size="sm"
            data-testid="settings-add-bot"
            disabled={environmentId === null}
            onClick={() => setAdding(true)}
          >
            Add bot
          </Button>
        }
      >
        {environmentId === null ? (
          <SettingsRow
            title="No machine connected"
            description="Add a machine before creating bots."
          />
        ) : isPending && bots.length === 0 ? (
          <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
            <Spinner className="size-4" />
            Loading bots
          </div>
        ) : bots.length === 0 ? (
          <SettingsRow
            title="No bots yet"
            description="A bot has a name, a role and a brief. Every chat you start with it answers as it."
          />
        ) : (
          bots.map((bot) => (
            <BotRow
              key={bot.id}
              bot={bot}
              environmentId={environmentId}
              onEdit={() => setEditing(bot)}
            />
          ))
        )}
      </SettingsSection>

      {environmentId !== null && adding ? (
        <BotDialog
          environmentId={environmentId}
          bot={null}
          onSettled={refresh}
          onOpenChange={(open) => {
            if (!open) setAdding(false);
          }}
        />
      ) : null}
      {environmentId !== null && editing ? (
        <BotDialog
          environmentId={environmentId}
          bot={editing}
          onSettled={refresh}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
    </SettingsPageContainer>
  );
}
