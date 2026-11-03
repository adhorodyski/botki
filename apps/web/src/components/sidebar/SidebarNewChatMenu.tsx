import { type BotId } from "@t3tools/contracts";
import { MessagesSquareIcon, Settings2Icon, UserRoundIcon } from "lucide-react";
import { useState } from "react";

import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { SidebarHeaderIconButton } from "./SidebarThreadHeader";

interface SidebarNewChatMenuProps {
  readonly bots: ReadonlyArray<{
    readonly botId: BotId;
    readonly name: string;
    readonly role: string;
  }>;
  readonly onOpenBot: (botId: BotId) => void;
  readonly onAddBot: () => void;
}

/**
 * Starting a chat means choosing who answers, so this replaces the old new-thread menu.
 * Creating and editing bots lives in settings; this only links there.
 */
export function SidebarNewChatMenu(props: SidebarNewChatMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger
        render={
          <SidebarHeaderIconButton label="New chat" tooltip="Start a chat with a bot">
            <MessagesSquareIcon />
          </SidebarHeaderIconButton>
        }
      />
      <MenuPopup align="end" className="w-60">
        {props.bots.length === 0 ? (
          <MenuItem disabled>No bots yet</MenuItem>
        ) : (
          props.bots.map((bot) => (
            <MenuItem
              key={`${String(bot.botId)}`}
              data-testid={`new-chat-${String(bot.botId)}`}
              onClick={() => props.onOpenBot(bot.botId)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <UserRoundIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{bot.name}</span>
                <span className="min-w-0 shrink truncate text-muted-foreground text-xs">
                  {bot.role}
                </span>
              </span>
            </MenuItem>
          ))
        )}
        <MenuItem data-testid="new-chat-add-bot" onClick={props.onAddBot}>
          <span className="flex min-w-0 items-center gap-2">
            <Settings2Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">Add a bot</span>
          </span>
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
