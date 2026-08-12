"use client";

/**
 * Styled adapter for ArtifactSession.
 *
 * Behavior stays in `@aisdkagents/react` (`createArtifactSession`). The
 * session Root / Stream render no DOM — this file owns panel chrome and
 * `data-slot` / `data-stream-phase` visuals only.
 *
 * Bind chrome to a created session with `createArtifactSessionSkin(session)`.
 */

import type {
  ArtifactSessionNamespace,
  ArtifactSessionState,
  DataStreamPart,
} from "@aisdkagents/react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export { createArtifactSession } from "@aisdkagents/react";

export type {
  ArtifactKindAdapter,
  ArtifactSessionController,
  ArtifactSessionNamespace,
  ArtifactSessionRootProps,
  ArtifactSessionState,
  ArtifactSessionStreamProps,
  ArtifactStreamPhase,
} from "@aisdkagents/react";

// ---------------------------------------------------------------------------
// Skin factory — hooks bind to one module-level session namespace
// ---------------------------------------------------------------------------

export type ArtifactSessionSkin<
  TPart extends DataStreamPart,
  K extends string,
> = {
  Panel: (props: React.ComponentProps<"section">) => React.JSX.Element;
  Header: (props: React.ComponentProps<"header">) => React.JSX.Element;
  Title: (props: React.ComponentProps<"h3">) => React.JSX.Element;
  Meta: (props: React.ComponentProps<"div">) => React.JSX.Element;
  Content: (props: React.ComponentProps<"pre">) => React.JSX.Element;
  PhaseBadge: (
    props: Omit<React.ComponentProps<"span">, "children">
  ) => React.JSX.Element;
  Actions: (props: React.ComponentProps<"div">) => React.JSX.Element;
  Reset: (props: React.ComponentProps<typeof Button>) => React.JSX.Element;
  useSnapshot: () => ArtifactSessionState<K>;
  useSelector: <T>(selector: (state: ArtifactSessionState<K>) => T) => T;
  useController: ArtifactSessionNamespace<TPart, K>["useController"];
};

/**
 * Build styled panel parts bound to one `createArtifactSession` namespace.
 */
export function createArtifactSessionSkin<
  TPart extends DataStreamPart,
  K extends string,
>(session: ArtifactSessionNamespace<TPart, K>): ArtifactSessionSkin<TPart, K> {
  function Panel({ className, ...props }: React.ComponentProps<"section">) {
    const streamPhase = session.useSelector((state) => state.streamPhase);
    const kind = session.useSelector((state) => state.kind);

    return (
      <section
        className={cn(
          "bg-card text-card-foreground border-border flex w-full flex-col overflow-hidden rounded-xl border shadow-xs",
          "data-[stream-phase=streaming]:border-foreground/25",
          className
        )}
        data-kind={kind}
        data-slot="artifact-session-panel"
        data-stream-phase={streamPhase}
        {...props}
      />
    );
  }

  function Header({ className, ...props }: React.ComponentProps<"header">) {
    return (
      <header
        className={cn(
          "border-border flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3",
          className
        )}
        data-slot="artifact-session-header"
        {...props}
      />
    );
  }

  function Title({
    className,
    children,
    ...props
  }: React.ComponentProps<"h3">) {
    const title = session.useSelector((state) => state.title);

    return (
      <h3
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium tracking-tight",
          !title && "text-muted-foreground",
          className
        )}
        data-slot="artifact-session-title"
        {...props}
      >
        {children ?? (title || "Untitled artifact")}
      </h3>
    );
  }

  function Meta({ className, ...props }: React.ComponentProps<"div">) {
    const documentId = session.useSelector((state) => state.documentId);
    const kind = session.useSelector((state) => state.kind);

    return (
      <div
        className={cn(
          "text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]",
          className
        )}
        data-document-id={documentId ?? undefined}
        data-kind={kind}
        data-slot="artifact-session-meta"
        {...props}
      >
        <span>kind: {kind}</span>
        <span>id: {documentId ?? "—"}</span>
      </div>
    );
  }

  function Content({
    className,
    children,
    ...props
  }: React.ComponentProps<"pre">) {
    const content = session.useSelector((state) => state.content);
    const streamPhase = session.useSelector((state) => state.streamPhase);

    return (
      <pre
        aria-busy={streamPhase === "streaming" ? true : undefined}
        className={cn(
          "text-foreground min-h-32 flex-1 overflow-auto px-4 py-3 font-mono text-sm leading-relaxed whitespace-pre-wrap",
          !content && "text-muted-foreground",
          className
        )}
        data-slot="artifact-session-content"
        data-stream-phase={streamPhase}
        {...props}
      >
        {children ?? (content || "Waiting for stream…")}
      </pre>
    );
  }

  function PhaseBadge({
    className,
    ...props
  }: Omit<React.ComponentProps<"span">, "children">) {
    const streamPhase = session.useSelector((state) => state.streamPhase);

    return (
      <span
        className={cn(
          "border-border bg-background inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
          "data-[stream-phase=streaming]:border-foreground/20 data-[stream-phase=streaming]:bg-foreground/5",
          className
        )}
        data-slot="artifact-session-phase"
        data-stream-phase={streamPhase}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "bg-muted-foreground/40 size-1.5 rounded-full",
            "[[data-stream-phase=streaming]_&]:bg-foreground [[data-stream-phase=streaming]_&]:animate-pulse"
          )}
        />
        {streamPhase}
      </span>
    );
  }

  function Actions({ className, ...props }: React.ComponentProps<"div">) {
    return (
      <div
        className={cn(
          "border-border flex flex-wrap items-center gap-2 border-t px-4 py-3",
          className
        )}
        data-slot="artifact-session-actions"
        {...props}
      />
    );
  }

  function Reset({
    className,
    children = "Reset",
    variant = "outline",
    size = "sm",
    onClick,
    ...props
  }: React.ComponentProps<typeof Button>) {
    const { reset } = session.useController();

    return (
      <Button
        className={cn(className)}
        data-slot="artifact-session-reset"
        size={size}
        type="button"
        variant={variant}
        onClick={(event) => {
          reset();
          onClick?.(event);
        }}
        {...props}
      >
        {children}
      </Button>
    );
  }

  return {
    Actions,
    Content,
    Header,
    Meta,
    Panel,
    PhaseBadge,
    Reset,
    Title,
    useController: session.useController,
    useSelector: session.useSelector,
    useSnapshot: session.useSnapshot,
  };
}
