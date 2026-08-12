"use client";

import {
  fileExtensionLabel,
  formatFileSize,
  isLikelyTextFile,
  PromptInput as PromptInputPrimitive,
  usePromptInputContext,
} from "@aisdkagents/react/prompt-input";
import type {
  PromptInputAttachment as AttachmentData,
  PromptInputModelDefinition,
  PromptInputRootProps,
} from "@aisdkagents/react/prompt-input";
import { Check, X } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import * as React from "react";
import { createPortal } from "react-dom";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Private skin chrome (semantic tokens — no app imports)
// ---------------------------------------------------------------------------

type PromptInputVariant = "pill" | "rounded";

const FRAME_SHADOW =
  "shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.3)]";

const MENU_SURFACE =
  "rounded-xl border-[0.5px] border-border bg-popover shadow-xs";

const MENU_ITEM =
  "flex h-[26px] w-full cursor-pointer items-center gap-1.5 rounded-[7px] border-0 bg-transparent px-[7px] text-left text-[11px] leading-3 [font-weight:425] text-foreground hover:bg-accent active:bg-accent data-selected:bg-accent";

const MENU_LABEL =
  "px-2 pt-2 pb-1 text-[11px] [font-weight:425] text-muted-foreground first:pt-1";

const MENU_DIVIDER = "-mx-[3px] my-1 h-[0.5px] bg-border";

const SOURCE_MENU_ITEM =
  "relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[8px] border-0 bg-transparent px-2 text-left hover:bg-accent active:bg-accent";

const ICON_BTN =
  "relative inline-flex size-7 flex-none items-center justify-center border-0 bg-transparent before:absolute before:inset-0 before:rounded-lg before:transition-[background-color,transform] before:duration-150 before:ease-[cubic-bezier(0.22,1,0.36,1)] before:content-[''] active:before:scale-[0.98] motion-reduce:before:transition-none [[data-variant=pill]_&]:before:rounded-full [&>svg]:relative";

const BTN_FILL = "before:bg-foreground/5 hover:before:bg-foreground/10";

const CHIP =
  "inline-flex max-w-full items-center gap-[5px] rounded-lg border-[0.5px] border-border bg-popover py-[3px] pr-1 pl-[5px] text-foreground text-[11px] leading-[14px] shadow-xs [[data-variant=pill]_&]:rounded-full";

const ATTACHMENT_TILE =
  "relative shrink-0 overflow-hidden rounded-md border-[0.5px] border-border bg-popover shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 [[data-variant=pill]_&]:rounded-2xl";

const PALETTE_ITEM =
  "relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-[10px] border-0 bg-transparent px-2.5 text-left hover:bg-accent active:bg-accent data-highlighted:bg-accent";

const PALETTE_SURFACE = `${MENU_SURFACE} z-50 max-h-64 overflow-x-hidden overflow-y-auto p-1.5`;

/**
 * Compact inline tokens (Cursor / ChatGPT-style mentions).
 * No × affordance — contenteditable=false atoms delete via Backspace.
 */
const TOKEN_STYLES = [
  "[&_[data-token]]:relative [&_[data-token]]:-top-px [&_[data-token]]:mx-0.5 [&_[data-token]]:inline-flex [&_[data-token]]:h-5 [&_[data-token]]:max-w-[min(100%,16rem)] [&_[data-token]]:select-none [&_[data-token]]:items-center [&_[data-token]]:gap-1 [&_[data-token]]:whitespace-nowrap [&_[data-token]]:rounded-md [&_[data-token]]:px-1.5 [&_[data-token]]:align-middle [&_[data-token]]:font-medium [&_[data-token]]:text-[11px] [&_[data-token]]:leading-none [&_[data-token]]:tracking-[-0.01em] [&_[data-token][data-start]]:ml-0",
  "[&_[data-token=skill]]:bg-primary/10 [&_[data-token=skill]]:text-primary",
  "[&_[data-token=source]]:bg-muted [&_[data-token=source]]:text-foreground",
  "[&_[data-token=source][data-brand]]:bg-muted",
  "[&_[data-token][data-selected]]:bg-[Highlight] [&_[data-token][data-selected]]:text-[HighlightText]",
  "[&_[data-token][data-selected]_[data-slot=prompt-input-token-icon]]:text-[HighlightText]",
  "[&_[data-slot=prompt-input-token-label]]:min-w-0 [&_[data-slot=prompt-input-token-label]]:truncate",
  "[&_[data-slot=prompt-input-token-icon]]:inline-flex [&_[data-slot=prompt-input-token-icon]]:size-3 [&_[data-slot=prompt-input-token-icon]]:shrink-0 [&_[data-slot=prompt-input-token-icon]]:items-center [&_[data-slot=prompt-input-token-icon]]:justify-center [&_[data-slot=prompt-input-token-icon]]:text-muted-foreground [&_[data-slot=prompt-input-token-icon]_svg]:block",
  // Opt-in: hide remove controls if a custom createTokenElement still emits them
  "[&_[data-remove]]:hidden",
].join(" ");

function frameRadiusClass(variant: PromptInputVariant, tall: boolean): string {
  if (variant === "pill" && !tall) {
    return "rounded-full";
  }
  if (variant === "pill") {
    return "rounded-[24px]";
  }
  return "rounded-xl";
}

async function animateTokenRemove(pill: HTMLElement, commit: () => void) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    commit();
    return;
  }

  const { width } = pill.getBoundingClientRect();
  pill.style.maxWidth = `${width}px`;
  pill.style.overflow = "hidden";
  pill.style.whiteSpace = "nowrap";
  pill.style.pointerEvents = "none";

  let done = false;
  const finish = () => {
    if (done) {
      return;
    }
    done = true;
    commit();
  };

  window.setTimeout(finish, 260);
  try {
    await animate(
      pill,
      {
        opacity: 0,
        scale: 0.96,
        filter: "blur(2px)",
        maxWidth: "0px",
        marginLeft: "0px",
        marginRight: "0px",
        paddingLeft: "0px",
        paddingRight: "0px",
      },
      { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
    );
    finish();
  } catch {
    finish();
  }
}

// ---------------------------------------------------------------------------
// Root + layout slots
// ---------------------------------------------------------------------------

type StyledRootProps = PromptInputRootProps & {
  /** Measure text width and flip to expanded grid. @default true */
  autoExpand?: boolean;
  /** Compact chips vs large media tiles for attachments. @default false */
  largeAttachments?: boolean;
  variant?: PromptInputVariant;
};

type SkinOptions = {
  largeAttachments: boolean;
  /** Sibling of the clipped frame — menus / palettes portal here. */
  overlayHost: HTMLElement | null;
  variant: PromptInputVariant;
};

const SkinOptionsContext = React.createContext<SkinOptions>({
  largeAttachments: false,
  overlayHost: null,
  variant: "rounded",
});

/** Lift overlays out of the overflow-clipped frame (inspiration parity). */
function PromptInputOverlay({ children }: { children: React.ReactNode }) {
  const { overlayHost } = React.useContext(SkinOptionsContext);
  if (!overlayHost) {
    return null;
  }
  return createPortal(
    <div className="pointer-events-auto" data-slot="prompt-input-overlay">
      {children}
    </div>,
    overlayHost
  );
}

function PromptInput({
  autoExpand = true,
  children,
  className,
  createTokenElement,
  largeAttachments = false,
  onTokenRemove: onTokenRemoveProp,
  onValueChange,
  variant = "rounded",
  ...props
}: StyledRootProps) {
  const [value, setValue] = React.useState(props.defaultValue ?? "");
  const [expanded, setExpanded] = React.useState(false);
  const [overlayHost, setOverlayHost] = React.useState<HTMLDivElement | null>(
    null
  );
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const controlsRef = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const onTokenRemove = React.useCallback(
    (pill: HTMLElement, commit: () => void) => {
      if (onTokenRemoveProp) {
        onTokenRemoveProp(pill, commit);
        return;
      }
      if (reduceMotion) {
        commit();
        return;
      }
      void animateTokenRemove(pill, commit);
    },
    [onTokenRemoveProp, reduceMotion]
  );

  const handleValueChange = React.useCallback(
    (next: string) => {
      setValue(next);
      onValueChange?.(next);
    },
    [onValueChange]
  );

  React.useLayoutEffect(() => {
    if (!autoExpand) {
      return;
    }
    const measure = measureRef.current;
    const controls = controlsRef.current;
    if (!(measure && controls)) {
      return;
    }
    // Measure the actual controls — not the Leading/Trailing slots.
    // When expanded, Leading sits in a 1fr column and stretch-inflates
    // offsetWidth, which would trap the layout in the expanded state.
    const plus =
      controls.querySelector<HTMLElement>(
        "[data-slot='prompt-input-menu-trigger']"
      ) ??
      controls.querySelector<HTMLElement>(
        "[data-slot='prompt-input-leading'] button"
      );
    const trailing =
      controls.querySelector<HTMLElement>(
        "[data-slot='prompt-input-submit']"
      ) ??
      controls.querySelector<HTMLElement>(
        "[data-slot='prompt-input-trailing'] button"
      );
    const fixedWidth =
      (plus?.offsetWidth ?? 28) + (trailing?.offsetWidth ?? 28);
    const inlineInputWidth = controls.clientWidth - fixedWidth - 8;
    const hasPills = Boolean(
      controls.querySelector("[data-skill], [data-source], [data-token]")
    );
    const needsFullWidth =
      value.includes("\n") ||
      hasPills ||
      measure.offsetWidth + 8 > inlineInputWidth;
    if (needsFullWidth !== expanded) {
      setExpanded(needsFullWidth);
    }
  }, [autoExpand, expanded, value, props.attachments]);

  const tall =
    Boolean(props.attachments?.length) ||
    Boolean(props.defaultAttachments?.length) ||
    expanded;

  const skinOptions = React.useMemo(
    () => ({ largeAttachments, overlayHost, variant }),
    [largeAttachments, overlayHost, variant]
  );

  return (
    <SkinOptionsContext.Provider value={skinOptions}>
      <PromptInputPrimitive.Root
        className={cn(
          "relative w-full max-w-[480px] min-w-0 overflow-visible [&_svg]:[stroke-width:1.5px]",
          TOKEN_STYLES,
          className
        )}
        createTokenElement={createTokenElement}
        data-slot="prompt-input"
        data-variant={variant}
        onTokenRemove={onTokenRemove}
        onValueChange={handleValueChange}
        {...props}
      >
        <div
          className={cn(
            "bg-popover relative flex min-w-0 flex-col gap-1.5 overflow-x-hidden border-[0.5px] border-transparent p-2 transition-[border-radius] duration-150",
            FRAME_SHADOW,
            frameRadiusClass(variant, tall)
          )}
          data-expanded={expanded || undefined}
          data-slot="prompt-input-frame"
          data-tall={tall || undefined}
        >
          {/* Inside overflow-x-hidden frame so long paste lines can't widen the page */}
          <span
            aria-hidden="true"
            className="pointer-events-none invisible absolute text-[13px] leading-5 tracking-[-0.12px] whitespace-pre"
            data-slot="prompt-input-measure"
            ref={measureRef}
          >
            {value || props.value}
          </span>
          <div
            className={cn(
              "group/controls grid min-w-0 gap-x-1.5 gap-y-1.5",
              expanded
                ? "grid-cols-[minmax(0,1fr)_auto_auto] items-end"
                : "grid-cols-[auto_minmax(0,1fr)_auto] items-center"
            )}
            data-expanded={expanded || undefined}
            data-slot="prompt-input-controls"
            ref={controlsRef}
          >
            {children}
          </div>
        </div>
        {/* Menus / palettes portal here so frame overflow can't clip them */}
        <div
          className="pointer-events-none absolute inset-0 z-50"
          data-slot="prompt-input-overlay-root"
          ref={setOverlayHost}
        />
      </PromptInputPrimitive.Root>
    </SkinOptionsContext.Provider>
  );
}

function PromptInputProvider(
  props: React.ComponentProps<typeof PromptInputPrimitive.Provider>
) {
  return <PromptInputPrimitive.Provider {...props} />;
}

function PromptInputHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "order-first col-span-full flex min-w-0 flex-wrap items-center gap-1",
        className
      )}
      data-slot="prompt-input-header"
      {...props}
    />
  );
}

function PromptInputBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative col-start-2 row-start-1 max-w-full min-w-0",
        // Sit below attachment chips when present
        "group-has-[[data-slot=prompt-input-attachments]]/controls:row-start-2",
        // Expanded: editor full-width on its row
        "group-data-expanded/controls:col-span-full group-data-expanded/controls:col-start-1 group-data-expanded/controls:row-start-1",
        "group-has-[[data-slot=prompt-input-attachments]]/controls:group-data-expanded/controls:row-start-2",
        className
      )}
      data-slot="prompt-input-body"
      {...props}
    />
  );
}

function PromptInputFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-span-full flex min-w-0 items-center justify-between gap-1",
        className
      )}
      data-slot="prompt-input-footer"
      {...props}
    />
  );
}

function PromptInputTools({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-1", className)}
      data-slot="prompt-input-tools"
      {...props}
    />
  );
}

function PromptInputLeading({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative col-start-1 row-start-1 flex w-fit shrink-0 justify-self-start",
        "group-has-[[data-slot=prompt-input-attachments]]/controls:row-start-2",
        "group-data-expanded/controls:col-start-1 group-data-expanded/controls:row-start-2",
        "group-has-[[data-slot=prompt-input-attachments]]/controls:group-data-expanded/controls:row-start-3",
        className
      )}
      data-slot="prompt-input-leading"
      {...props}
    />
  );
}

function PromptInputTrailing({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-start-3 row-start-1 flex w-fit shrink-0 items-center gap-1 justify-self-end",
        "group-has-[[data-slot=prompt-input-attachments]]/controls:row-start-2",
        "group-data-expanded/controls:col-start-3 group-data-expanded/controls:row-start-2",
        "group-has-[[data-slot=prompt-input-attachments]]/controls:group-data-expanded/controls:row-start-3",
        className
      )}
      data-slot="prompt-input-trailing"
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Editor / Submit
// ---------------------------------------------------------------------------

function PromptInputEditor({
  className,
  placeholder = "Ask anything…",
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.Editor>) {
  return (
    <PromptInputPrimitive.Editor
      className={cn(
        "text-foreground before:text-muted-foreground relative m-0 max-h-48 min-h-7 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto bg-transparent px-1 py-1 text-[13px] leading-5 tracking-[-0.12px] [overflow-wrap:anywhere] break-words whitespace-pre-wrap outline-none selection:bg-[color:Highlight] selection:text-[color:HighlightText] before:pointer-events-none before:absolute before:top-1 before:left-1 before:content-[''] data-[empty]:before:content-[attr(data-placeholder)]",
        className
      )}
      data-slot="prompt-input-editor"
      placeholder={placeholder}
      {...props}
    />
  );
}

function ArrowUpIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="12"
      viewBox="0 0 24 24"
      width="12"
    >
      <rect height="14" rx="2" width="14" x="5" y="5" />
    </svg>
  );
}

function PromptInputSubmit({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.Submit>) {
  const { status } = usePromptInputContext("PromptInputSubmit");
  const streaming = status === "streaming" || status === "submitted";

  return (
    <PromptInputPrimitive.Submit
      className={cn(
        ICON_BTN,
        "text-muted-foreground before:bg-foreground/5 cursor-pointer disabled:cursor-default disabled:active:before:transform-none",
        "data-ready:text-primary-foreground data-ready:before:bg-primary data-ready:hover:before:bg-primary/90",
        "data-stoppable:text-primary-foreground data-stoppable:before:bg-primary",
        className
      )}
      data-slot="prompt-input-submit"
      {...props}
    >
      {children ?? (streaming ? <SquareIcon /> : <ArrowUpIcon />)}
    </PromptInputPrimitive.Submit>
  );
}

function PlusIcon({ open }: { open?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex transition-transform duration-200 ease-[cubic-bezier(0.35,1.55,0.65,1)] motion-reduce:transition-none",
        open && "rotate-45"
      )}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        width="16"
      >
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    </span>
  );
}

function PromptInputMenuIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-muted-foreground inline-flex flex-none", className)}
      data-slot="prompt-input-menu-icon"
      {...props}
    />
  );
}

function PromptInputMenuLabelText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex-auto overflow-hidden text-ellipsis whitespace-nowrap",
        className
      )}
      data-slot="prompt-input-menu-label-text"
      {...props}
    />
  );
}

function PromptInputPaletteSectionLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-muted-foreground px-2.5 pt-2.5 pb-1 text-[11px] font-medium first:pt-1",
        className
      )}
      data-slot="prompt-input-palette-section-label"
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Menu chrome
// ---------------------------------------------------------------------------

function PromptInputMenu(
  props: React.ComponentProps<typeof PromptInputPrimitive.Menu>
) {
  return <PromptInputPrimitive.Menu data-slot="prompt-input-menu" {...props} />;
}

function PromptInputMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.MenuTrigger>) {
  const { menuOpen } = usePromptInputContext("PromptInputMenuTrigger");
  return (
    <PromptInputPrimitive.MenuTrigger
      className={cn(
        ICON_BTN,
        "text-foreground cursor-pointer",
        menuOpen ? "before:bg-foreground/10" : BTN_FILL,
        className
      )}
      data-slot="prompt-input-menu-trigger"
      {...props}
    >
      {children ?? <PlusIcon open={menuOpen} />}
    </PromptInputPrimitive.MenuTrigger>
  );
}

function PromptInputMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.MenuContent>) {
  return (
    <PromptInputOverlay>
      <PromptInputPrimitive.MenuContent
        className={cn(
          MENU_SURFACE,
          "data-open:blur-0 absolute bottom-full left-0 z-50 mb-2 w-[180px] origin-bottom-left p-[3px] transition-[opacity,transform,filter] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] not-data-open:pointer-events-none not-data-open:translate-y-1 not-data-open:scale-[0.98] not-data-open:opacity-0 not-data-open:blur-[2px] data-open:translate-y-0 data-open:scale-100 data-open:opacity-100 motion-reduce:transition-none",
          className
        )}
        data-slot="prompt-input-menu-content"
        {...props}
      />
    </PromptInputOverlay>
  );
}

function PromptInputMenuFlyout({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.MenuFlyout>) {
  return (
    <PromptInputPrimitive.MenuFlyout
      className={cn(
        MENU_SURFACE,
        "absolute -top-[3px] left-[calc(100%+6px)] z-50 p-[3px] before:absolute before:inset-y-0 before:-left-[7px] before:w-[7px] before:content-['']",
        className
      )}
      data-slot="prompt-input-menu-flyout"
      {...props}
    />
  );
}

function PromptInputMenuFlyoutTrigger({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.MenuFlyoutTrigger>) {
  return (
    <PromptInputPrimitive.MenuFlyoutTrigger
      className={cn(MENU_ITEM, className)}
      data-slot="prompt-input-menu-flyout-trigger"
      {...props}
    />
  );
}

function PromptInputMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(MENU_LABEL, className)}
      data-slot="prompt-input-menu-label"
      {...props}
    />
  );
}

function PromptInputMenuSeparator({
  className,
  ...props
}: React.ComponentProps<"hr">) {
  return (
    <hr
      className={cn(MENU_DIVIDER, "border-0", className)}
      data-slot="prompt-input-menu-separator"
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Catalog items
// ---------------------------------------------------------------------------

function PromptInputModel({
  className,
  children,
  context,
  desc,
  icon,
  value,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.Model> &
  Pick<PromptInputModelDefinition, "context" | "desc"> & {
    icon?: React.ReactNode;
  }) {
  const { modelId } = usePromptInputContext("PromptInputModel");
  const selected = modelId === value;

  return (
    <div className="group/model relative">
      <PromptInputPrimitive.Model
        className={cn(MENU_ITEM, className)}
        data-slot="prompt-input-model"
        value={value}
        {...props}
      >
        {icon ? (
          <span className="text-foreground inline-flex flex-none">{icon}</span>
        ) : null}
        <PromptInputMenuLabelText>{children}</PromptInputMenuLabelText>
        {selected ? (
          <span className="text-foreground inline-flex flex-none">
            <Check size={14} />
          </span>
        ) : null}
      </PromptInputPrimitive.Model>
      {desc || context ? (
        <div
          className={cn(
            MENU_SURFACE,
            "pointer-events-none absolute -top-[3px] left-[calc(100%+6px)] z-30 w-[200px] px-3 py-2.5 opacity-0 transition-opacity duration-100 group-hover/model:opacity-100"
          )}
          role="tooltip"
        >
          <div className="text-foreground text-xs leading-4 font-medium">
            {children}
          </div>
          {desc ? (
            <p className="text-muted-foreground m-0 mt-0.5 text-[11px] leading-[15px]">
              {desc}
            </p>
          ) : null}
          {context ? (
            <div className="text-muted-foreground mt-2 text-[11px] leading-[14px]">
              {context}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PromptInputSkill({
  children,
  className,
  icon,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.Skill> & {
  icon?: React.ReactNode;
}) {
  return (
    <PromptInputPrimitive.Skill
      className={cn(MENU_ITEM, className)}
      data-slot="prompt-input-skill"
      {...props}
    >
      {icon ? <PromptInputMenuIcon>{icon}</PromptInputMenuIcon> : null}
      <PromptInputMenuLabelText>{children}</PromptInputMenuLabelText>
    </PromptInputPrimitive.Skill>
  );
}

function PromptInputSource({
  className,
  children,
  icon,
  variant = "menu",
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.Source> & {
  icon?: React.ReactNode;
  /** `flyout` = taller stacked row (inspiration Sources panel). */
  variant?: "flyout" | "menu";
}) {
  return (
    <PromptInputPrimitive.Source
      className={cn(
        variant === "flyout" ? SOURCE_MENU_ITEM : MENU_ITEM,
        className
      )}
      data-slot="prompt-input-source"
      {...props}
    >
      {icon ? (
        <span className="text-muted-foreground inline-flex size-5.5 shrink-0 items-center justify-center [&_svg]:block">
          {icon}
        </span>
      ) : null}
      {children}
    </PromptInputPrimitive.Source>
  );
}

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

function PromptInputSlashPalette({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.SlashPalette>) {
  return (
    <PromptInputOverlay>
      <PromptInputPrimitive.SlashPalette
        className={cn(
          PALETTE_SURFACE,
          "absolute inset-x-0 bottom-full z-50 mb-3 w-full max-w-full",
          className
        )}
        data-slot="prompt-input-slash-palette"
        {...props}
      />
    </PromptInputOverlay>
  );
}

function PromptInputAtPalette({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.AtPalette>) {
  return (
    <PromptInputOverlay>
      <PromptInputPrimitive.AtPalette
        className={cn(
          PALETTE_SURFACE,
          "absolute inset-x-0 bottom-full z-50 mb-3 w-full max-w-full",
          className
        )}
        data-slot="prompt-input-at-palette"
        {...props}
      />
    </PromptInputOverlay>
  );
}

function PromptInputPaletteItem({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.PaletteItem>) {
  return (
    <PromptInputPrimitive.PaletteItem
      className={cn(PALETTE_ITEM, className)}
      data-slot="prompt-input-palette-item"
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Files / attachments
// ---------------------------------------------------------------------------

function PromptInputFileInput(
  props: React.ComponentProps<typeof PromptInputPrimitive.FileInput>
) {
  return (
    <PromptInputPrimitive.FileInput
      data-slot="prompt-input-file-input"
      {...props}
    />
  );
}

function PromptInputFileTrigger({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.FileTrigger>) {
  return (
    <PromptInputPrimitive.FileTrigger
      className={cn(MENU_ITEM, className)}
      data-slot="prompt-input-file-trigger"
      {...props}
    />
  );
}

function PromptInputScreenshotTrigger({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.ScreenshotTrigger>) {
  return (
    <PromptInputPrimitive.ScreenshotTrigger
      className={cn(MENU_ITEM, className)}
      data-slot="prompt-input-screenshot-trigger"
      {...props}
    />
  );
}

function attachmentExtensionLabel(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "file").slice(0, 4) : "file";
}

/** Lightbox for image attachments (inspiration parity — no document chrome). */
function AttachmentImagePreviewDialog({
  attachment,
  onOpenChange,
  open,
}: {
  attachment: AttachmentData;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { name, preview } = attachment;
  if (!preview) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="z-[200] max-w-[min(100%-2rem,40rem)] gap-0 border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-[min(100%-2rem,40rem)]"
        overlayClassName="z-[200] bg-black/70 supports-backdrop-filter:backdrop-blur-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Preview of {name}</DialogTitle>
        <DialogDescription className="sr-only">
          Full-size preview of the attached image.
        </DialogDescription>
        <div className="relative mx-auto w-fit">
          <DialogClose
            className="absolute top-0 left-full z-10 ml-1.5 inline-flex size-8 items-center justify-center rounded-full text-white transition-colors outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
            render={<button aria-label="Close image preview" type="button" />}
          >
            <X aria-hidden size={16} strokeWidth={2} />
          </DialogClose>
          <div className="bg-popover overflow-hidden rounded-[10px] shadow-[0_4px_32px_rgba(0,0,0,0.3)]">
            {/* oxlint-disable-next-line next/no-img-element -- blob preview URL */}
            <img
              alt={name}
              className="block max-h-[min(80vh,720px)] max-w-[min(100vw-4rem,40rem)] object-contain"
              height={720}
              src={preview}
              width={640}
            />
          </div>
          <p className="mt-2 text-center text-sm text-white [text-shadow:0_0_8px_rgba(0,0,0,0.25)]">
            {name}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Document-style preview for text-like files. */
function AttachmentFilePreviewDialog({
  attachment,
  onOpenChange,
  open,
}: {
  attachment: AttachmentData;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { file, name } = attachment;
  const [textPreview, setTextPreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!(open && file && isLikelyTextFile(file))) {
      setTextPreview(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const text = await file.text();
        if (!cancelled) {
          setTextPreview(text.slice(0, 4000));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setTextPreview(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, open]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="border-border bg-popover text-popover-foreground z-[200] flex max-h-[min(90vh,calc(100%-2rem))] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-4 text-left shadow-lg sm:max-w-3xl md:p-6"
        overlayClassName="z-[200] bg-black/50 supports-backdrop-filter:backdrop-blur-none"
        showCloseButton={false}
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <DialogTitle className="min-w-0 flex-1 pr-2 text-base leading-6 font-semibold wrap-anywhere">
            {name}
          </DialogTitle>
          <DialogClose
            className="text-muted-foreground hover:bg-muted hover:text-foreground -mx-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors outline-none"
            render={<button aria-label="Close" type="button" />}
          >
            <X aria-hidden size={16} strokeWidth={2} />
          </DialogClose>
        </div>
        <DialogDescription className="text-muted-foreground mt-0.5 mb-2 shrink-0 text-xs">
          {file ? formatFileSize(file.size) : "Attached file"}
        </DialogDescription>
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="border-border/40 bg-card text-foreground max-h-[min(60vh,480px)] min-h-[120px] overflow-y-auto rounded-lg border p-4 font-mono text-xs break-all whitespace-pre-wrap shadow-sm">
            {loading
              ? "Loading preview…"
              : (textPreview ?? "Preview unavailable")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentChipContent({
  attachment,
  isImage,
  large,
}: {
  attachment: AttachmentData;
  isImage: boolean;
  large: boolean;
}) {
  const { file, name, preview } = attachment;

  if (large && isImage) {
    return (
      // oxlint-disable-next-line next/no-img-element -- blob preview URL
      <img
        alt={name}
        className="size-full object-cover"
        height={72}
        src={preview ?? undefined}
        width={72}
      />
    );
  }

  return (
    <>
      {isImage ? (
        // oxlint-disable-next-line next/no-img-element -- blob preview URL
        <img
          alt=""
          className="size-4 rounded-[3px] object-cover"
          height={16}
          src={preview ?? undefined}
          width={16}
        />
      ) : (
        <span className="border-border bg-muted text-muted-foreground inline-flex h-[18px] min-w-0 items-center rounded border-[0.5px] px-1 text-[11px] leading-[13px] font-medium uppercase">
          {file ? fileExtensionLabel(file) : attachmentExtensionLabel(name)}
        </span>
      )}
      <span className="min-w-0 truncate">{name}</span>
      {file ? (
        <span className="text-muted-foreground shrink-0 tabular-nums">
          {formatFileSize(file.size)}
        </span>
      ) : null}
    </>
  );
}

function PromptInputAttachmentChip({
  attachment,
  large,
}: {
  attachment: AttachmentData;
  large: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const isImage = attachment.kind === "image" && Boolean(attachment.preview);
  const canPreviewText = Boolean(
    attachment.file && isLikelyTextFile(attachment.file)
  );
  const previewable = isImage || canPreviewText;

  return (
    <>
      <PromptInputPrimitive.Attachment
        className={cn(
          large && isImage
            ? cn(ATTACHMENT_TILE, "size-[72px]")
            : cn(CHIP, "max-w-[200px]"),
          previewable && "cursor-pointer",
          "group/attachment"
        )}
        data-slot="prompt-input-attachment"
        id={attachment.id}
        onClick={() => {
          if (previewable) {
            setOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (previewable && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        role={previewable ? "button" : undefined}
        tabIndex={previewable ? 0 : undefined}
      >
        <AttachmentChipContent
          attachment={attachment}
          isImage={isImage}
          large={large}
        />
        <PromptInputPrimitive.AttachmentRemove
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground -ml-0.5 inline-flex h-[15px] w-[15px] cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent transition-[background-color,color] duration-150",
            large &&
              isImage &&
              "bg-popover/90 absolute top-1 right-1 size-5 rounded-full"
          )}
          data-slot="prompt-input-attachment-remove"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <span aria-hidden="true">×</span>
        </PromptInputPrimitive.AttachmentRemove>
      </PromptInputPrimitive.Attachment>
      {isImage ? (
        <AttachmentImagePreviewDialog
          attachment={attachment}
          onOpenChange={setOpen}
          open={open}
        />
      ) : null}
      {canPreviewText && !isImage ? (
        <AttachmentFilePreviewDialog
          attachment={attachment}
          onOpenChange={setOpen}
          open={open}
        />
      ) : null}
    </>
  );
}

function PromptInputAttachments({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.Attachments>) {
  const { attachments } = usePromptInputContext("PromptInputAttachments");
  const { largeAttachments } = React.useContext(SkinOptionsContext);
  const reduceMotion = useReducedMotion();

  if (attachments.length === 0) {
    return <PromptInputPrimitive.Attachments className="hidden" {...props} />;
  }

  return (
    <AnimatePresence propagate>
      <motion.div
        animate={{ height: "auto", opacity: 1 }}
        className={cn(
          "col-span-full row-start-1 flex min-w-0",
          largeAttachments ? "flex-wrap gap-2" : "flex-wrap gap-1.5",
          className
        )}
        data-slot="prompt-input-attachments"
        exit={{ height: 0, opacity: 0 }}
        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
        key="attachments"
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <PromptInputPrimitive.Attachments className="contents" {...props} />
        {attachments.map((attachment) => (
          <PromptInputAttachmentChip
            attachment={attachment}
            key={attachment.id}
            large={largeAttachments}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

function PromptInputReferencedSources({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.ReferencedSources>) {
  return (
    <PromptInputPrimitive.ReferencedSources
      className={cn(
        "col-span-full flex flex-wrap gap-1.5 empty:hidden",
        className
      )}
      data-slot="prompt-input-referenced-sources"
      {...props}
    />
  );
}

function PromptInputReferencedSource({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.ReferencedSource>) {
  return (
    <PromptInputPrimitive.ReferencedSource
      className={cn(CHIP, className)}
      data-slot="prompt-input-referenced-source"
      {...props}
    />
  );
}

function PromptInputReferencedSourceRemove({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.ReferencedSourceRemove>) {
  return (
    <PromptInputPrimitive.ReferencedSourceRemove
      className={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-4 items-center justify-center rounded-sm",
        className
      )}
      data-slot="prompt-input-referenced-source-remove"
      {...props}
    />
  );
}

function PromptInputLiveRegion({
  className,
  ...props
}: React.ComponentProps<typeof PromptInputPrimitive.LiveRegion>) {
  return (
    <PromptInputPrimitive.LiveRegion
      className={cn("sr-only", className)}
      data-slot="prompt-input-live-region"
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Select / HoverCard / Command wrappers (ai-elements parity)
// ---------------------------------------------------------------------------

function PromptInputSelect(props: React.ComponentProps<typeof Select>) {
  return <Select data-slot="prompt-input-select" {...props} />;
}

function PromptInputSelectTrigger({
  className,
  ...props
}: React.ComponentProps<typeof SelectTrigger>) {
  return (
    <SelectTrigger
      className={cn(
        "border-border text-foreground h-7 bg-transparent text-[12px] shadow-none",
        className
      )}
      data-slot="prompt-input-select-trigger"
      {...props}
    />
  );
}

function PromptInputSelectContent({
  className,
  ...props
}: React.ComponentProps<typeof SelectContent>) {
  return (
    <SelectContent
      className={cn("border-border bg-popover", className)}
      data-slot="prompt-input-select-content"
      {...props}
    />
  );
}

function PromptInputSelectItem(props: React.ComponentProps<typeof SelectItem>) {
  return <SelectItem data-slot="prompt-input-select-item" {...props} />;
}

function PromptInputSelectValue(
  props: React.ComponentProps<typeof SelectValue>
) {
  return <SelectValue data-slot="prompt-input-select-value" {...props} />;
}

function PromptInputHoverCard(props: React.ComponentProps<typeof HoverCard>) {
  return <HoverCard data-slot="prompt-input-hover-card" {...props} />;
}

function PromptInputHoverCardTrigger(
  props: React.ComponentProps<typeof HoverCardTrigger>
) {
  return (
    <HoverCardTrigger data-slot="prompt-input-hover-card-trigger" {...props} />
  );
}

function PromptInputHoverCardContent({
  className,
  ...props
}: React.ComponentProps<typeof HoverCardContent>) {
  return (
    <HoverCardContent
      className={cn("border-border bg-popover text-foreground", className)}
      data-slot="prompt-input-hover-card-content"
      {...props}
    />
  );
}

function PromptInputCommand({
  className,
  ...props
}: React.ComponentProps<typeof Command>) {
  return (
    <Command
      className={cn("bg-popover text-foreground", className)}
      data-slot="prompt-input-command"
      {...props}
    />
  );
}

function PromptInputCommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandInput>) {
  return (
    <CommandInput
      className={cn("text-[13px]", className)}
      data-slot="prompt-input-command-input"
      {...props}
    />
  );
}

function PromptInputCommandList(
  props: React.ComponentProps<typeof CommandList>
) {
  return <CommandList data-slot="prompt-input-command-list" {...props} />;
}

function PromptInputCommandEmpty(
  props: React.ComponentProps<typeof CommandEmpty>
) {
  return (
    <CommandEmpty
      className="text-muted-foreground text-[12px]"
      data-slot="prompt-input-command-empty"
      {...props}
    />
  );
}

function PromptInputCommandGroup(
  props: React.ComponentProps<typeof CommandGroup>
) {
  return <CommandGroup data-slot="prompt-input-command-group" {...props} />;
}

function PromptInputCommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandItem>) {
  return (
    <CommandItem
      className={cn(PALETTE_ITEM, className)}
      data-slot="prompt-input-command-item"
      {...props}
    />
  );
}

export {
  PromptInput,
  PromptInputAtPalette,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputCommand,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandInput,
  PromptInputCommandItem,
  PromptInputCommandList,
  PromptInputEditor,
  PromptInputFileInput,
  PromptInputFileTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputHoverCard,
  PromptInputHoverCardContent,
  PromptInputHoverCardTrigger,
  PromptInputLeading,
  PromptInputLiveRegion,
  PromptInputMenu,
  PromptInputMenuContent,
  PromptInputMenuFlyout,
  PromptInputMenuFlyoutTrigger,
  PromptInputMenuIcon,
  PromptInputMenuLabel,
  PromptInputMenuLabelText,
  PromptInputMenuSeparator,
  PromptInputMenuTrigger,
  PromptInputModel,
  PromptInputPaletteItem,
  PromptInputPaletteSectionLabel,
  PromptInputProvider,
  PromptInputReferencedSource,
  PromptInputReferencedSourceRemove,
  PromptInputReferencedSources,
  PromptInputScreenshotTrigger,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSkill,
  PromptInputSlashPalette,
  PromptInputSource,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputTrailing,
};
