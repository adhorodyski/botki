/**
 * The hero for a draft chat with a bot. It names the bot and nothing else: a bot's chat has no
 * checkout to build in, so the project hero's heading and its project picker do not apply.
 */
export function DraftHeroBotHeading(props: { botName: string }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
      <h1 className="w-full text-center font-normal text-2xl text-foreground tracking-tight sm:text-3xl">
        What should <span className="font-medium">{props.botName}</span> do?
      </h1>
    </div>
  );
}
