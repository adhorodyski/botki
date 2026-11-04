# Botki

Botki is a self-hosted team of personal agents that are yours. You add a bot, give it a
job — a role and a brief in your own words — and it becomes a chat you can talk to from any
device, on your machine, with the model you chose. Not a prompt you paste each time: a bot
keeps its threads and its brief, and every chat with it answers as that bot.

It is the open-source version of Grok bots, Claude Duet, and OpenAI Dots. Same idea — bots
as the thing you talk to, rather than a chat window you reopen — minus the hosted account,
the fixed model, and the company holding your conversations. Your machine, your providers,
your files.

It is a fork of [t3code](https://github.com/pingdotgg/t3code) by [T3 Tools](https://t3.gg).
What survived the fork is the hard part: the event-sourced orchestrator, the provider
adapters, checkpointing, and the web and desktop clients. What we removed was the parts of
a developer's editor that personal agents do not need — account auth, hosted relay, guest
shares, forge and pull-request integrations, the code editor, and telemetry. Attribution is
in [NOTICE](./NOTICE); the license is [MIT](./LICENSE).

<!-- Screenshot placeholder: needs-you queue. Add docs/assets/botki-needs-you.png
     and replace this comment with an image once the queue screen has a real look. -->

## Quickstart

Install [Vite+](https://vite.plus), whose `vp` command runs this repo's dev, test, and
build tasks and provides the Node version pinned in the `engines` field of
[`package.json`](./package.json) — so you do not install Node separately:

```sh
curl -fsSL https://vite.plus | bash    # macOS / Linux
irm https://vite.plus/ps1 | iex        # Windows
```

Then, in a fresh clone:

```sh
git clone https://github.com/adhorodyski/botki
cd botki
vp i                                  # install dependencies
vp run dev                            # server + web app, state in this checkout
```

If you would rather not install `vp` globally, enable the pinned `pnpm` with `corepack
enable` and run the same steps through it. `pnpm dev:desktop` below is exactly that form.

**Every checkout keeps its own state.** `vp run dev` stores state in that checkout's `.t3`
— a linked worktree or a plain clone alike — and prints the path it chose, so a dev run never
touches the database your real install uses. Pass `--home-dir` to choose somewhere else.

`vp run dev` prints a `pairingUrl:` — open that in a browser rather than the bare origin,
which will not authenticate a new browser.

Prefer the desktop app? It runs against the same local server:

```sh
pnpm dev:desktop
```

Bring some real data into the sandbox before you test anything that an empty database
makes uninteresting — `vp run migrate-dev-db` rebuilds your checkout's database from a
read-only copy of an existing install. See
[AGENTS.md](./AGENTS.md#test-data) for what that keeps and what it deliberately drops.

## Providers

Botki drives the agent CLIs already installed on your machine; it brings no model of its
own. Install and authenticate at least one before your first run:

| Provider    | Install                                                     | Sign in               |
| ----------- | ----------------------------------------------------------- | --------------------- |
| Pi          | `npm i -g --ignore-scripts @earendil-works/pi-coding-agent` | `pi`, then `/login`   |
| Claude Code | [Claude Code](https://claude.com/product/claude-code)       | `claude auth login`   |
| Codex       | [Codex CLI](https://developers.openai.com/codex/cli)        | `codex login`         |
| OpenCode    | [OpenCode](https://opencode.ai)                             | `opencode auth login` |

Pi is the reference provider: it is what the tests, the fixtures, and the docs assume. A bot's
brief reaches its turns on the adapters that declare they can carry one — Pi and Claude today
— and the others stay in the tree because upstream maintains them. On a provider that cannot,
a bot's turn is refused and names that provider rather than answering as an unnamed assistant:
a silently-wrong bot is worse than a stopped one. Carrying briefs on the rest is open work,
not a limitation of the design.

## How bots work

A bot is a name, a role, and a brief — the job you wrote for it, in your words. Every
conversation you start with that bot answers as it: same role, same brief, every turn,
without you restating anything, and an edit to the brief lands on the next turn. A copy is
written to `bots/<botId>/BRIEF.md` so you can read it or move it between machines, but the
stored bot is the source: editing that file by hand does not change how the bot behaves. The
exact behavior is in [specs/19-add-bot.md](./specs/19-add-bot.md).

A chat with a bot is a thread, which means it already gets everything the app does: history,
provider and model choice per thread, permission modes, checkpoints, and remote access from
your phone. Nothing about a bot is a special case hidden behind a chat UI.

Bots are early. Right now you talk to one at a time; bots that talk to each other, and rooms
where several of them work the same thread together, are the next thing.

The details that keep an unattended run from doing damage — the verification bar, the
reuse bar, and never killing a process by name pattern — are in
[AGENTS.md](./AGENTS.md).

## Documentation

Docs live in [docs/](./docs). There is no docs site.

- [FAQ](./docs/user/faq.md)
- [Install and first run](./docs/user/install.md)
- [Remote access from a phone or another machine](./docs/user/remote-access.md)
- [Permission modes](./docs/user/permission-modes.md)
- [Project settings](./docs/user/project-settings.md)
- [Run the server as a background service](./docs/user/background-service.md)
- [Connect outside agents over MCP](./docs/user/outside-agents.md)
- [Keyboard shortcuts](./docs/user/keybindings.md)

Building from source? Start at [docs/internals/overview.md](./docs/internals/overview.md),
and read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

## Status

Early, and moving. The bot is the product and it is where the bugs are. The sidebar is already
the list of your bot chats — a thread with no bot stays out of it.
