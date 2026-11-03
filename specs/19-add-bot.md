# Add bot

A bot is a teammate: a name, a one-line role, and a brief. Botki lists them in a **Team**
section of the sidebar, under the projects.

**Adding and editing.** _Add bot_ opens a form with those three fields. The name and role are
required; the brief can be empty. Under the name, the form shows the folder the bot will write
to, such as `bots/viki/BRIEF.md`, derived from the name. Editing a bot opens the same form with
its values filled in. Two bots may share a name; the second gets its own folder anyway, and
renaming never moves a bot's folder.

**Talking to one.** Clicking a teammate opens a new draft owned by that bot, with the project a
plain _New thread_ would have used. Nothing is created until you send: the thread that appears
in the normal thread list belongs to the bot, and every turn in it answers according to the
brief. A bot's brief reaches its threads' turns and no others; threads you start normally are
untouched by any bot, and stay exactly as they were.

The Team shelf below the thread list is temporary placement. The plan is that a bot _is_ a
thread, so bots appear among the threads above rather than in a section of their own; the
shelf stays only until that model lands, and nothing about storage or the brief depends on
where the entry point lives.

**Deleting.** Deleting asks first, and says what survives: the bot stops receiving new turns and
its threads remain, but its folder and everything the owner or an agent wrote in it stays on
disk. Nothing is removed from disk when a bot is deleted.

**On disk.** Each bot has `<home>/bots/<id>/BRIEF.md`: a title line naming the bot and its role,
then the brief as written. Editing name, role, or brief rewrites that file. It is a copy for
reading and moving between machines, not the source, so editing it by hand does not change how
the bot behaves.

**Limits.** Bots have no avatars, no per-bot settings page, and no memory between threads:
everything a bot knows comes from its brief. Bots are configured per server, on the machine
running it.
