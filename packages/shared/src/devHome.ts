/** Checksouts use isolated .t3 state; ambient T3CODE_HOME could otherwise select the live userdata database. */

import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

// Match worktrees/<name>; bare repos and GIT_COMMON_DIR need not use a directory named .git.
const pointsAtLinkedWorktree = (gitFileContents: string, path: Path.Path): boolean => {
  const gitdir = gitFileContents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("gitdir:"))
    ?.slice("gitdir:".length)
    .trim();
  if (gitdir === undefined || gitdir.length === 0) {
    return false;
  }
  const segments = path
    .normalize(gitdir.replaceAll("\\", "/"))
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0);
  return segments.length >= 3 && segments.at(-2) === "worktrees";
};

const findGitMarkerDirectory = Effect.fn("devHome.findGitMarkerDirectory")(function* (
  cwd: string,
): Effect.fn.Return<string | undefined, never, FileSystem.FileSystem | Path.Path> {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  let directory = path.resolve(cwd);
  for (;;) {
    const hasGitMarker = yield* fileSystem
      .exists(path.join(directory, ".git"))
      .pipe(Effect.orElseSucceed(() => false));
    if (hasGitMarker) {
      return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
});

export const resolveGitWorktreePath = Effect.fn("devHome.resolveGitWorktreePath")(function* (
  cwd: string,
): Effect.fn.Return<string | undefined, never, FileSystem.FileSystem | Path.Path> {
  const directory = yield* findGitMarkerDirectory(cwd);
  if (directory === undefined) {
    return undefined;
  }
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  // A `.git` directory is a plain checkout or bare repo, never a linked worktree.
  const contents = yield* fileSystem
    .readFileString(path.join(directory, ".git"))
    .pipe(Effect.orElseSucceed(() => ""));
  return pointsAtLinkedWorktree(contents, path) ? directory : undefined;
});

/** Neither resolver requires `.t3` to exist yet: falling back because it is
 * missing would send callers at the shared home. */
export const resolveWorktreeT3Home = Effect.fn("devHome.resolveWorktreeT3Home")(function* (
  cwd: string,
): Effect.fn.Return<string | undefined, never, FileSystem.FileSystem | Path.Path> {
  const worktreePath = yield* resolveGitWorktreePath(cwd);
  if (worktreePath === undefined) {
    return undefined;
  }
  const path = yield* Path.Path;
  return path.join(worktreePath, ".t3");
});

/**
 * Any checkout's own `.t3`, linked worktree or plain clone. A clone is not a
 * linked worktree, so `resolveWorktreeT3Home` answers undefined there and a
 * dev run would land on the shared home — the developer's real database.
 */
export const resolveCheckoutT3Home = Effect.fn("devHome.resolveCheckoutT3Home")(function* (
  cwd: string,
): Effect.fn.Return<string | undefined, never, FileSystem.FileSystem | Path.Path> {
  const root = yield* findGitMarkerDirectory(cwd);
  if (root === undefined) {
    return undefined;
  }
  const path = yield* Path.Path;
  return path.join(root, ".t3");
});
