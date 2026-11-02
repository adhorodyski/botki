# Botki

Botki is a self-hosted team of coding agents that works on your repositories while you
sleep. You point it at a repo, tell each bot which slice of the backlog it owns, and it
builds, verifies, and opens a pull request overnight — so the only thing you read in the
morning is the queue of work that genuinely needs you.

It is a fork of [t3code](https://github.com/pingdotgg/t3code) by [T3 Tools](https://t3.gg).
What survived the fork is the hard part: the event-sourced orchestrator, the provider
adapters, checkpointing, and the web and desktop clients. What we removed was the parts
of a developer's editor that a night shift does not need — account auth, hosted relay,
guest shares, forge and pull-request integrations, the code editor, and telemetry.
Attribution is in [NOTICE](./NOTICE); the license is [MIT](./LICENSE).

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
vp run dev --home-dir ./.t3           # server + web app, state in this checkout
```

If you would rather not install `vp` globally, enable the pinned `pnpm` with `corepack
enable` and run the same steps through it. `pnpm dev:desktop` below is exactly that form.

**Point `--home-dir` at the checkout.** A plain clone is not a linked `git worktree`, and only
a linked worktree gets its own `.t3` by default; in a bare clone, bare `vp run dev` resolves
state to `~/.t3`, which is wherever your real install keeps its database. Passing `--home-dir`
makes the sandbox explicit and cannot land you on shared state by accident. If you work in a
linked worktree (`git worktree add`), omit it and the dev runner picks that worktree's `.t3`
for you.

`vp run dev` prints a `pairingUrl:` — open that in a browser rather than the bare origin,
which will not authenticate a new browser.

Prefer the desktop app? It runs against the same local server:

```sh
pnpm dev:desktop --home-dir ./.t3
```

Bring some real data into the sandbox before you test anything that an empty database
makes uninteresting — `vp run migrate-dev-db` rebuilds your worktree's database from a
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

Pi is the reference provider: it is what the tests, the fixtures, and the docs assume.
The others stay in the tree because upstream maintains their adapters, but nothing we
ship depends on them.

## How a night works

One issue becomes one slice, one slice becomes one night and one pull request. A bot picks
up a spec'd issue, does the work, verifies it against the acceptance checklist written for
that slice, and opens a PR with a run report: what it ran, what passed, and what it
deliberately did not touch. Work it cannot finish becomes a draft PR with the blocker in
your queue rather than silence.

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

Early. The nightly loop is the product and it is where the bugs are. Expect to read the
run reports.
