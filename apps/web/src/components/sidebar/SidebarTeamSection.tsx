import { type Bot, type BotId, type EnvironmentId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { BotIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useLocalStorage } from "../../hooks/useLocalStorage";

import { useBots } from "../../state/bots";
import { BotDialog } from "../BotDialog";
import { Button } from "../ui/button";
import { CollapsibleSectionHeader } from "../ui/collapsible-section-header";

const TEAM_SHELF_EXPANDED_KEY = "t3code:sidebar:team-expanded";

/**
 * Bots are entry points to a new thread, not threads: a row opens a draft carrying `botId`, and
 * the thread only exists once its first message is sent. Their history stays in the thread list.
 */
export function SidebarTeamSection(props: {
  environmentId: EnvironmentId;
  onOpenBot: (botId: BotId) => void;
}) {
  const { bots, refresh } = useBots(props.environmentId);
  const [editing, setEditing] = useState<Bot | null>(null);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useLocalStorage(TEAM_SHELF_EXPANDED_KEY, true, Schema.Boolean);

  return (
    <div className="flex flex-col gap-px" data-testid="sidebar-team-section">
      <CollapsibleSectionHeader
        expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        data-testid="sidebar-team-shelf-toggle"
        accessory={<span className="font-normal tabular-nums">{bots.length}</span>}
      >
        Team
      </CollapsibleSectionHeader>
      <ul role="group" aria-label="Team" hidden={!expanded} className="flex flex-col gap-px">
        {bots.map((bot) => (
          <li key={bot.id} className="list-none">
            <div className="mx-0.5 flex h-7 w-[calc(100%-0.25rem)] min-w-0 items-center gap-1 rounded-md ps-2 hover:bg-sidebar-row-hover">
              <button
                type="button"
                data-testid={`sidebar-bot-${bot.id}`}
                onClick={() => props.onOpenBot(bot.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left text-sm text-sidebar-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
              >
                <BotIcon className="size-3.5 shrink-0 text-sidebar-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{bot.name}</span>
              </button>
              <Button
                variant="ghost-muted"
                size="icon-xs"
                data-testid={`sidebar-bot-${bot.id}-edit`}
                aria-label={`Edit ${bot.name}`}

                onClick={() => setEditing(bot)}
              >
                <PencilIcon className="size-3" />
              </Button>
            </div>
          </li>
        ))}
        <li className="list-none">
          <Button
            variant="ghost-muted"
            size="xs"
            className="mx-0.5 justify-start"
            onClick={() => setAdding(true)}
          >
            <PlusIcon className="size-3" aria-hidden />
            Add bot
          </Button>
        </li>
      </ul>
      {adding || editing !== null ? (
        <BotDialog
          environmentId={props.environmentId}
          bot={editing}
          onSettled={refresh}
          onOpenChange={(nextOpen: boolean) => {
            if (nextOpen) return;
            setAdding(false);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
