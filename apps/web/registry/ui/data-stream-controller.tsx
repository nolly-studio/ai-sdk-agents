"use client";

/**
 * Styled adapter for DataStreamController.
 *
 * Behavior stays in `@aisdkagents/react`. Root / Handler render no DOM — this
 * file owns layout chrome, status visuals, and `data-slot`s only.
 */

import { DataStreamController as DataStreamControllerPrimitive } from "@aisdkagents/react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DataStreamController = DataStreamControllerPrimitive;

export type {
  DataStreamControllerApi,
  DataStreamControllerNamespace,
  DataStreamPart,
  DataStreamPartErrorHandler,
  DataStreamPartHandler,
  DataStreamStatus,
} from "@aisdkagents/react";

// ---------------------------------------------------------------------------
// Styled-only layout shells
// ---------------------------------------------------------------------------

function DataStreamControllerFrame({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground border-border flex w-full flex-col gap-4 rounded-xl border p-4 shadow-xs",
        className
      )}
      data-slot="data-stream-controller-frame"
      {...props}
    />
  );
}

function DataStreamControllerToolbar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-slot="data-stream-controller-toolbar"
      {...props}
    />
  );
}

function DataStreamControllerLog({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "bg-muted/40 border-border max-h-56 space-y-1 overflow-y-auto rounded-lg border px-3 py-2 font-mono text-sm",
        className
      )}
      data-slot="data-stream-controller-log"
      {...props}
    />
  );
}

function DataStreamControllerLogItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("text-foreground/90 leading-relaxed", className)}
      data-slot="data-stream-controller-log-item"
      {...props}
    />
  );
}

function DataStreamControllerLogEmpty({
  className,
  children = "No parts delivered yet",
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="data-stream-controller-log-empty"
      {...props}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Status — reads primitive snapshot; adapter owns visual data-*
// ---------------------------------------------------------------------------

function DataStreamControllerStatus({
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children">) {
  const status = DataStreamController.useStatus();

  return (
    <span
      className={cn(
        "border-border bg-background inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums",
        "data-[pending=true]:border-foreground/20 data-[pending=true]:bg-foreground/5",
        className
      )}
      data-pending={status.hasPendingParts ? "true" : "false"}
      data-pending-count={status.pendingCount}
      data-slot="data-stream-controller-status"
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "bg-muted-foreground/40 size-1.5 rounded-full",
          "[[data-pending=true]_&]:bg-foreground [[data-pending=true]_&]:animate-pulse"
        )}
      />
      <span className="text-muted-foreground">pending</span>
      <span className="text-foreground">{status.pendingCount}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Clear — command chrome over useController (no queue logic here)
// ---------------------------------------------------------------------------

function DataStreamControllerClear({
  className,
  children = "Clear queue",
  variant = "outline",
  size = "sm",
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { clear } = DataStreamController.useController();

  return (
    <Button
      className={cn(className)}
      data-slot="data-stream-controller-clear"
      size={size}
      type="button"
      variant={variant}
      onClick={(event) => {
        clear();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export {
  DataStreamControllerClear,
  DataStreamControllerFrame,
  DataStreamControllerLog,
  DataStreamControllerLogEmpty,
  DataStreamControllerLogItem,
  DataStreamControllerStatus,
  DataStreamControllerToolbar,
};
