# Add bot

A bot is a name, a one-line role, and a brief. A chat with a bot is a conversation, and the
conversation list shows only those: a chat is titled with the bot's name, carries the bot's
initial where a project icon would sit, and shows the role in its second line. No repo,
branch, worktree, or diff appears on a bot's chat. Chats are not grouped under projects.

**Adding and editing.** Bots are managed under **Settings → Bots**: the list with each bot's
brief and role, an _Add bot_ button, and _Edit_ per row. The form asks for name, role, and
brief; name and role are required, the brief may be empty, and the form shows the folder the
bot will write to, such as `bots/viki/BRIEF.md`, derived from the name. Editing reuses the same
form with values filled in. Two bots may share a name; the second gets its own folder anyway,
and renaming never moves a bot's folder.

**Starting a chat.** _New chat_ in the sidebar lists your bots by name and role; picking one
opens a draft owned by that bot, and nothing is created until you send. Its last item, _Add a
bot_, goes to settings. A bot's brief reaches its own chats' turns and no others.

**Deleting.** Deleting asks first, and says what survives: the bot stops receiving new turns and
its chats remain, but its folder and everything written in it stays on disk.

**On disk.** Each bot has `<home>/bots/<id>/BRIEF.md`: a title line naming the bot and its role,
then the brief as written. Editing name, role, or brief rewrites that file. It is a copy for
reading and moving between machines, not the source, so editing it by hand does not change how
the bot behaves. Alongside it sits `MEMORY.md`, which works the other way round: the bot writes
it and the file itself is the source, so a turn reads exactly what is there.

**What a chat shows.** A bot's own chat names the bot and nothing else: its initial and name sit
where the project crumb would, an empty composer asks what the bot should do, and the worktree,
branch, project scripts, `Open in`, git actions, and diff controls are absent. Threads with no bot
keep all of those exactly as they were.

**What a bot remembers.** A bot can save one short note about what it learned, and that note
reaches its later conversations — a different chat with the same bot starts knowing it. What it
has learned always arrives after the brief and never outranks it, it is capped at 4,000
characters, and a write past the cap is refused with the reason rather than quietly shortened,
so a growing file can never push the brief out of a turn. **Settings → Bots** shows what each
bot knows and lets you rewrite it or empty it; your wording then survives whatever the bot
saves next. Nothing is inferred from your chats, and one bot never reads another's notes.

**Limits today.** A brief reaches a turn on providers that carry one; a chat whose provider
cannot will refuse the turn and name that provider rather than answer as an unnamed assistant —
including the dev Replay provider, which replays answers rather than generating them. One bot
per conversation — a room where several bots share one thread is not built. A chat still lives
on a workspace behind the scenes; only its name is hidden, so a bot's turn still runs in that
checkout. A bot writes its notes when asked to, not on its own: nothing distils a past
conversation into memory, and nothing searches one. Bots have no avatars. Bots are configured
per server, on the machine running it.
