import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { observeResize } from "~/lib/observeResize";

interface DraftHeroProjectHeadingProps {
  children: ReactNode;
  /** The name the hero is about — a project, or the bot a chat belongs to. */
  subject: string;
  /** Before the name, with the question already attached for the stacked layout. */
  stackedLead?: string;
  /** Before the name once the name fits on the same line. */
  inlineLead?: string;
  /** After the name; the stacked layout folds it into the lead instead. */
  trailing?: string;
}

const DEFAULTS = {
  stackedLead: "What should we build?",
  inlineLead: "What should we build in",
  trailing: "?",
};

export function DraftHeroProjectHeading({
  children,
  subject,
  stackedLead = DEFAULTS.stackedLead,
  inlineLead = DEFAULTS.inlineLead,
  trailing = DEFAULTS.trailing,
}: DraftHeroProjectHeadingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineRef = useRef<HTMLSpanElement>(null);
  const [fitsInline, setFitsInline] = useState(false);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- measures the heading against its container via ResizeObserver to choose inline or stacked layout
  useLayoutEffect(() => {
    const container = containerRef.current;
    const inline = inlineRef.current;
    if (!container || !inline) return;

    // Measure the full inline heading independently of its current layout, so
    // moving the name below it cannot make the fit check oscillate.
    const update = () =>
      setFitsInline(
        inline.getBoundingClientRect().width <= container.getBoundingClientRect().width,
      );
    update();
    return observeResize([container, inline], update);
  }, []);

  return (
    <div ref={containerRef} className="group/draft-hero relative w-full" data-inline={fitsInline}>
      <span
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
      >
        <span
          ref={inlineRef}
          className="flex w-max items-baseline gap-2 whitespace-nowrap font-normal text-3xl tracking-tight"
        >
          <span>{inlineLead}</span>
          <span>
            <span className="font-medium">{subject}</span>
            {trailing}
          </span>
        </span>
      </span>
      <h1 className="flex w-full flex-col items-center justify-center gap-2 text-center font-normal text-2xl text-foreground tracking-tight sm:text-3xl lg:group-data-[inline=true]/draft-hero:flex-row">
        <span className="max-w-full lg:group-data-[inline=true]/draft-hero:shrink-0">
          <span className="lg:group-data-[inline=true]/draft-hero:hidden">{stackedLead}</span>
          <span className="hidden lg:group-data-[inline=true]/draft-hero:inline">{inlineLead}</span>
        </span>
        <span className="flex min-w-0 max-w-full items-baseline justify-center text-base tracking-normal lg:group-data-[inline=true]/draft-hero:text-3xl lg:group-data-[inline=true]/draft-hero:tracking-tight">
          <span className="min-w-0">{children}</span>
          <span className="hidden shrink-0 lg:group-data-[inline=true]/draft-hero:inline">
            {trailing}
          </span>
        </span>
      </h1>
    </div>
  );
}
