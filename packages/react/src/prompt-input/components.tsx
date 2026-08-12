import * as React from "react";

import { mergeProps, useRender } from "../use-render";
import { getSourceSection } from "./collection";
import { PromptInputContext, usePromptInputContext } from "./context";
import {
  collectTokenIds,
  getTokenBeforeCollapsedCaret,
  markTokenSelectionAttributes,
  selectTokenNode,
} from "./editor";
import type {
  PromptInputAtPaletteProps,
  PromptInputAttachmentProps,
  PromptInputAttachmentRemoveProps,
  PromptInputAttachmentsProps,
  PromptInputEditorProps,
  PromptInputFileInputProps,
  PromptInputFileTriggerProps,
  PromptInputLiveRegionProps,
  PromptInputMenuContentProps,
  PromptInputMenuFlyoutProps,
  PromptInputMenuFlyoutTriggerProps,
  PromptInputMenuProps,
  PromptInputMenuTriggerProps,
  PromptInputModelProps,
  PromptInputPaletteItemProps,
  PromptInputReferencedSourceProps,
  PromptInputReferencedSourceRemoveProps,
  PromptInputReferencedSourcesProps,
  PromptInputRootProps,
  PromptInputScreenshotTriggerProps,
  PromptInputSkillProps,
  PromptInputSlashPaletteProps,
  PromptInputSourceProps,
  PromptInputSubmitProps,
} from "./types";
import { usePromptInputRoot } from "./use-prompt-input-root";

function PromptInputHiddenFields() {
  const { getEditor, modelId, referencedSources, syncHiddenInput } =
    usePromptInputContext("PromptInput.HiddenFields");

  if (!syncHiddenInput) {
    return null;
  }

  const editor = getEditor();
  const skillIds = collectTokenIds(editor, "skill");
  const sourceIds = collectTokenIds(editor, "source");

  return (
    <>
      {modelId ? <input name="modelId" type="hidden" value={modelId} /> : null}
      {skillIds.map((id) => (
        <input key={`skill-${id}`} name="skillIds" type="hidden" value={id} />
      ))}
      {sourceIds.map((id) => (
        <input key={`source-${id}`} name="sourceIds" type="hidden" value={id} />
      ))}
      {referencedSources.map((source) => (
        <input
          key={`ref-${source.id}`}
          name="referencedSources"
          type="hidden"
          value={JSON.stringify(source)}
        />
      ))}
    </>
  );
}

function PromptInputRoot({
  accept,
  attachments,
  children,
  clearOnSubmit,
  createTokenElement,
  defaultAttachments,
  defaultMenuOpen,
  defaultModelId,
  defaultReferencedSources,
  defaultValue,
  disabled,
  editorMode,
  globalDrop,
  maxFileSize,
  maxFiles,
  menuOpen,
  modelId,
  models,
  multiline,
  onAttachmentsChange,
  onError,
  onMenuOpenChange,
  onModelChange,
  onReferencedSourcesChange,
  onStop,
  onSubmit,
  onTokenRemove,
  onValueChange,
  readonly,
  ref,
  referencedSources,
  skills,
  sources,
  status,
  submitting,
  syncHiddenInput,
  triggers,
  value,
  ...props
}: PromptInputRootProps) {
  const { context, rootProps, state } = usePromptInputRoot({
    accept,
    attachments,
    clearOnSubmit,
    createTokenElement,
    defaultAttachments,
    defaultMenuOpen,
    defaultModelId,
    defaultReferencedSources,
    defaultValue,
    disabled,
    editorMode,
    globalDrop,
    maxFileSize,
    maxFiles,
    menuOpen,
    modelId,
    models,
    multiline,
    onAttachmentsChange,
    onError,
    onMenuOpenChange,
    onModelChange,
    onReferencedSourcesChange,
    onStop,
    onSubmit,
    onTokenRemove,
    onValueChange,
    readonly,
    ref,
    referencedSources,
    skills,
    sources,
    status,
    submitting,
    syncHiddenInput,
    triggers,
    value,
  });

  const element = useRender({
    defaultTagName: "form",
    props: mergeProps<"form">(
      {
        ...rootProps,
        children: (
          <>
            {children}
            <PromptInputHiddenFields />
          </>
        ),
      },
      props
    ),
    state,
  });

  return (
    <PromptInputContext.Provider value={context}>
      {element}
    </PromptInputContext.Provider>
  );
}

function useEditorKeyHandlers() {
  const context = usePromptInputContext("PromptInput.Editor");
  const [composing, setComposing] = React.useState(false);
  const {
    addFiles,
    attachments,
    atOpen,
    empty,
    multiline,
    removeAttachment,
    slashOpen,
    submit,
  } = context;

  const handleEnterKey = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter") {
      return false;
    }
    if (composing || event.nativeEvent.isComposing) {
      return true;
    }
    if (!(multiline && event.shiftKey)) {
      event.preventDefault();
      submit();
      return true;
    }
    return false;
  };

  const handleBackspaceEmpty = (event: React.KeyboardEvent) => {
    if (
      event.key === "Backspace" &&
      empty &&
      attachments.length > 0 &&
      !(slashOpen || atOpen)
    ) {
      event.preventDefault();
      const last = attachments.at(-1);
      if (last) {
        removeAttachment(last.id);
      }
      return true;
    }
    return false;
  };

  const handlePasteFiles = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
    if (files.length) {
      event.preventDefault();
      addFiles(files);
    }
  };

  return {
    handleBackspaceEmpty,
    handleEnterKey,
    handlePasteFiles,
    setComposing,
  };
}

function PromptInputPlainEditor({
  name = "message",
  placeholder,
  render,
  ...props
}: PromptInputEditorProps) {
  const {
    disabled,
    editorMode,
    empty,
    multiline,
    readonly,
    registerEditor,
    setValueFromPlainEditor,
    value,
  } = usePromptInputContext("PromptInput.Editor");
  const {
    handleBackspaceEmpty,
    handleEnterKey,
    handlePasteFiles,
    setComposing,
  } = useEditorKeyHandlers();

  return useRender({
    defaultTagName: "textarea",
    props: mergeProps<"textarea">(
      {
        "aria-label": placeholder,
        "aria-multiline": multiline,
        disabled: disabled || readonly,
        name,
        onChange: (event) => {
          const next = multiline
            ? event.currentTarget.value
            : event.currentTarget.value.replaceAll(/\r?\n/gu, " ");
          if (!multiline && next !== event.currentTarget.value) {
            event.currentTarget.value = next;
          }
          setValueFromPlainEditor(next);
        },
        onCompositionEnd: () => setComposing(false),
        onCompositionStart: () => setComposing(true),
        onKeyDown: (event) => {
          if (handleEnterKey(event)) {
            return;
          }
          handleBackspaceEmpty(event);
        },
        onPaste: handlePasteFiles,
        placeholder,
        readOnly: readonly,
        ref: (node: HTMLTextAreaElement | null) => {
          registerEditor(node);
        },
        rows: multiline ? 3 : 1,
        value,
      },
      props as React.ComponentPropsWithRef<"textarea">
    ),
    render,
    state: {
      disabled,
      empty,
      mode: editorMode,
      multiline,
      readonly,
    },
  });
}

function PromptInputRichEditor({
  name = "message",
  placeholder,
  render,
  ...props
}: PromptInputEditorProps) {
  const {
    activeDescendantId,
    atOpen,
    disabled,
    editorMode,
    empty,
    listboxId,
    multiline,
    readonly,
    registerEditor,
    removeTokenNearest,
    saveSelection,
    slashOpen,
    syncFromEditor,
    value,
  } = usePromptInputContext("PromptInput.Editor");
  const {
    handleBackspaceEmpty,
    handleEnterKey,
    handlePasteFiles,
    setComposing,
  } = useEditorKeyHandlers();
  const editorNodeRef = React.useRef<HTMLDivElement | null>(null);
  let listboxControlsId: string | undefined;
  if (slashOpen) {
    listboxControlsId = `${listboxId}-slash`;
  } else if (atOpen) {
    listboxControlsId = `${listboxId}-at`;
  }

  React.useEffect(() => {
    const syncTokenSelection = () => {
      const editor = editorNodeRef.current;
      if (!editor) {
        return;
      }
      markTokenSelectionAttributes(editor);
    };
    document.addEventListener("selectionchange", syncTokenSelection);
    return () => {
      document.removeEventListener("selectionchange", syncTokenSelection);
    };
  }, []);

  const editor = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        "aria-activedescendant": activeDescendantId ?? undefined,
        "aria-autocomplete": slashOpen || atOpen ? "list" : undefined,
        "aria-controls": listboxControlsId,
        "aria-expanded": slashOpen || atOpen ? true : undefined,
        "aria-haspopup": slashOpen || atOpen ? "listbox" : undefined,
        "aria-label": placeholder,
        "aria-multiline": multiline,
        contentEditable: !(disabled || readonly),
        "data-placeholder": placeholder,
        onBlur: saveSelection,
        onClick: (event) => {
          removeTokenNearest(event.target);
          const { target } = event;
          if (target instanceof Element) {
            const pill = target.closest<HTMLElement>(
              "[data-skill], [data-source], [data-token]"
            );
            if (
              pill &&
              event.currentTarget.contains(pill) &&
              !target.closest("[data-remove]")
            ) {
              selectTokenNode(pill);
            }
          }
          saveSelection();
        },
        onCompositionEnd: () => setComposing(false),
        onCompositionStart: () => setComposing(true),
        onInput: () => syncFromEditor(),
        onKeyDown: (event) => {
          if (
            (slashOpen || atOpen) &&
            (event.key === "Enter" ||
              event.key === "Tab" ||
              event.key === "ArrowUp" ||
              event.key === "ArrowDown" ||
              event.key === "Escape")
          ) {
            return;
          }
          if (
            event.key === "Backspace" &&
            !(event.metaKey || event.ctrlKey || event.altKey) &&
            !(slashOpen || atOpen)
          ) {
            const selection = window.getSelection();
            if (selection?.isCollapsed) {
              const token = getTokenBeforeCollapsedCaret(event.currentTarget);
              if (token) {
                event.preventDefault();
                selectTokenNode(token);
                return;
              }
            }
          }
          if (handleEnterKey(event)) {
            return;
          }
          handleBackspaceEmpty(event);
        },
        onKeyUp: saveSelection,
        onMouseDown: (event) => {
          const { target } = event;
          if (!(target instanceof Element)) {
            return;
          }
          const pill = target.closest<HTMLElement>(
            "[data-skill], [data-source], [data-token]"
          );
          if (
            pill &&
            event.currentTarget.contains(pill) &&
            !target.closest("[data-remove]")
          ) {
            event.preventDefault();
          }
        },
        onMouseUp: saveSelection,
        onPaste: handlePasteFiles,
        ref: (node: HTMLDivElement | null) => {
          editorNodeRef.current = node;
          registerEditor(node);
        },
        role: "combobox",
        suppressContentEditableWarning: true,
        tabIndex: disabled ? -1 : 0,
      },
      props
    ),
    render,
    state: {
      disabled,
      empty,
      mode: editorMode,
      multiline,
      readonly,
    },
  });

  return (
    <>
      {editor}
      <input name={name} type="hidden" value={value} />
    </>
  );
}

function PromptInputEditor(props: PromptInputEditorProps) {
  const { editorMode } = usePromptInputContext("PromptInput.Editor");
  if (editorMode === "plain") {
    return <PromptInputPlainEditor {...props} />;
  }
  return <PromptInputRichEditor {...props} />;
}

function PromptInputSubmit({
  render,
  onClick,
  ...props
}: PromptInputSubmitProps) {
  const { disabled, ready, status, stop, submitting } =
    usePromptInputContext("PromptInput.Submit");
  const stoppable = status === "streaming" || status === "submitted";
  const isDisabled = disabled || (!stoppable && (submitting || !ready));

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        "aria-label": stoppable ? "Stop" : "Send",
        disabled: isDisabled,
        onClick: (event) => {
          onClick?.(event);
          if (event.defaultPrevented) {
            return;
          }
          if (stoppable) {
            event.preventDefault();
            stop();
          }
          // Non-stoppable uses type="submit" so the form onSubmit path runs once.
        },
        type: stoppable ? "button" : "submit",
      },
      props
    ),
    render,
    state: { disabled: isDisabled, ready, status, stoppable },
  });
}

function PromptInputMenu({ render, ...props }: PromptInputMenuProps) {
  const { menuOpen } = usePromptInputContext("PromptInput.Menu");
  return useRender({
    defaultTagName: "div",
    props,
    render,
    state: { open: menuOpen },
  });
}

function PromptInputMenuTrigger({
  render,
  ...props
}: PromptInputMenuTriggerProps) {
  const { disabled, menuOpen, menuTriggerRef, toggleMenu } =
    usePromptInputContext("PromptInput.MenuTrigger");

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        "aria-expanded": menuOpen,
        "aria-haspopup": "menu",
        disabled,
        onClick: () => toggleMenu(),
        ref: (node: HTMLButtonElement | null) => {
          menuTriggerRef.current = node;
        },
        type: "button",
      },
      props
    ),
    render,
    state: { disabled, open: menuOpen },
  });
}

function PromptInputMenuContent({
  render,
  ...props
}: PromptInputMenuContentProps) {
  const { menuContentRef, menuOpen } = usePromptInputContext(
    "PromptInput.MenuContent"
  );

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        hidden: !menuOpen,
        inert: menuOpen ? undefined : true,
        ref: (node: HTMLDivElement | null) => {
          menuContentRef.current = node;
        },
        role: "menu",
      },
      props
    ),
    render,
    state: { open: menuOpen },
  });
}

function PromptInputMenuFlyoutTrigger({
  children,
  name,
  render,
  ...props
}: PromptInputMenuFlyoutTriggerProps) {
  const { keepFlyoutOpen, scheduleFlyoutClose } = usePromptInputContext(
    "PromptInput.MenuFlyoutTrigger"
  );

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        children,
        onFocus: () => keepFlyoutOpen(name),
        onMouseEnter: () => keepFlyoutOpen(name),
        onMouseLeave: () => scheduleFlyoutClose(),
      },
      props
    ),
    render,
  });
}

function PromptInputMenuFlyout({
  bridge = true,
  name,
  render,
  ...props
}: PromptInputMenuFlyoutProps) {
  const { flyoutOpen, keepFlyoutOpen, scheduleFlyoutClose } =
    usePromptInputContext("PromptInput.MenuFlyout");
  const open = flyoutOpen === name;

  const panel = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        hidden: !open,
        onFocus: () => keepFlyoutOpen(name),
        onMouseEnter: () => keepFlyoutOpen(name),
        onMouseLeave: () => scheduleFlyoutClose(),
        role: "menu",
      },
      props
    ),
    render,
    state: { open },
  });

  if (!bridge) {
    return panel;
  }

  return (
    <div
      data-prompt-input-flyout-root=""
      onMouseEnter={() => keepFlyoutOpen(name)}
      onMouseLeave={() => scheduleFlyoutClose()}
      style={{ position: "relative" }}
    >
      {open ? (
        <div
          aria-hidden="true"
          data-prompt-input-flyout-bridge=""
          onMouseEnter={() => keepFlyoutOpen(name)}
          style={{
            insetBlock: 0,
            insetInlineStart: -8,
            position: "absolute",
            width: 8,
          }}
        />
      ) : null}
      {panel}
    </div>
  );
}

function PromptInputLiveRegion({
  children,
  render,
  ...props
}: PromptInputLiveRegionProps) {
  const { announcement, status } = usePromptInputContext(
    "PromptInput.LiveRegion"
  );

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        "aria-live": "polite",
        "aria-atomic": true,
        children: children ?? announcement,
        role: "status",
      },
      props
    ),
    render,
    state: { status },
  });
}

function PromptInputScreenshotTrigger({
  render,
  ...props
}: PromptInputScreenshotTriggerProps) {
  const { captureAndAttachScreenshot, disabled } = usePromptInputContext(
    "PromptInput.ScreenshotTrigger"
  );

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        disabled,
        onClick: () => {
          void captureAndAttachScreenshot();
        },
        type: "button",
      },
      props
    ),
    render,
    state: { disabled },
  });
}

const ReferencedSourceIdContext = React.createContext<string | null>(null);

function PromptInputReferencedSources({
  render,
  ...props
}: PromptInputReferencedSourcesProps) {
  const { referencedSources } = usePromptInputContext(
    "PromptInput.ReferencedSources"
  );
  return useRender({
    defaultTagName: "div",
    props,
    render,
    state: { count: referencedSources.length },
  });
}

function PromptInputReferencedSource({
  children,
  id,
  render,
  ...props
}: PromptInputReferencedSourceProps) {
  const { referencedSources } = usePromptInputContext(
    "PromptInput.ReferencedSource"
  );
  const source = referencedSources.find((item) => item.id === id);
  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      { "data-referenced-source-id": id, children },
      props
    ),
    render,
    state: { hasUrl: Boolean(source?.url) },
  });

  if (!source) {
    return null;
  }

  return (
    <ReferencedSourceIdContext.Provider value={id}>
      {element}
    </ReferencedSourceIdContext.Provider>
  );
}

function PromptInputReferencedSourceRemove({
  label = "Remove referenced source",
  render,
  ...props
}: PromptInputReferencedSourceRemoveProps) {
  const { removeReferencedSource } = usePromptInputContext(
    "PromptInput.ReferencedSourceRemove"
  );
  const id = React.useContext(ReferencedSourceIdContext);

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        "aria-label": label,
        onClick: () => {
          if (id) {
            removeReferencedSource(id);
          }
        },
        type: "button",
      },
      props
    ),
    render,
  });
}

function PromptInputFileInput({
  kind = "file",
  render,
  ...props
}: PromptInputFileInputProps) {
  const { accept, addFiles, registerFileInput } = usePromptInputContext(
    "PromptInput.FileInput"
  );

  return useRender({
    defaultTagName: "input",
    props: mergeProps<"input">(
      {
        accept: kind === "image" ? "image/*" : accept,
        hidden: true,
        multiple: true,
        onChange: (event) => {
          const { files } = event.currentTarget;
          if (files?.length) {
            addFiles(
              files,
              (event.currentTarget.dataset.kind as "file" | "image") ?? kind
            );
          }
          event.currentTarget.value = "";
        },
        ref: (node: HTMLInputElement | null) => {
          registerFileInput(node);
        },
        type: "file",
      },
      props
    ),
    render,
  });
}

function PromptInputFileTrigger({
  kind = "file",
  render,
  ...props
}: PromptInputFileTriggerProps) {
  const { disabled, openFileDialog } = usePromptInputContext(
    "PromptInput.FileTrigger"
  );

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        disabled,
        onClick: () => openFileDialog(kind),
        role: "menuitem",
        type: "button",
      },
      props
    ),
    render,
    state: { disabled },
  });
}

const AttachmentIdContext = React.createContext<string | null>(null);

function PromptInputAttachments({
  render,
  ...props
}: PromptInputAttachmentsProps) {
  const { attachments } = usePromptInputContext("PromptInput.Attachments");
  return useRender({
    defaultTagName: "div",
    props,
    render,
    state: { count: attachments.length },
  });
}

function PromptInputAttachment({
  children,
  id,
  render,
  ...props
}: PromptInputAttachmentProps) {
  const { attachments } = usePromptInputContext("PromptInput.Attachment");
  const attachment = attachments.find((item) => item.id === id);
  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">({ "data-attachment-id": id, children }, props),
    render,
    state: { kind: attachment?.kind ?? "file" },
  });

  if (!attachment) {
    return null;
  }

  return (
    <AttachmentIdContext.Provider value={id}>
      {element}
    </AttachmentIdContext.Provider>
  );
}

function PromptInputAttachmentRemove({
  label = "Remove attachment",
  render,
  ...props
}: PromptInputAttachmentRemoveProps) {
  const { removeAttachment } = usePromptInputContext(
    "PromptInput.AttachmentRemove"
  );
  const attachmentId = React.useContext(AttachmentIdContext);

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        "aria-label": label,
        onClick: () => {
          if (attachmentId) {
            removeAttachment(attachmentId);
          }
        },
        type: "button",
      },
      props
    ),
    render,
  });
}

function PromptInputModel({
  disabled = false,
  render,
  value,
  children,
  ...props
}: PromptInputModelProps) {
  const { modelId, registerModel, selectModel, closeMenu } =
    usePromptInputContext("PromptInput.Model");
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const selected = modelId === value;
  const name = typeof children === "string" ? children : value;

  React.useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    return registerModel({
      disabled,
      element: ref.current,
      id: value,
      name,
    });
  }, [disabled, name, registerModel, value]);

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        "aria-checked": selected,
        children,
        disabled,
        onClick: () => {
          if (disabled) {
            return;
          }
          selectModel(value);
          closeMenu();
        },
        ref,
        role: "menuitemradio",
        type: "button",
      },
      props
    ),
    render,
    state: { disabled, selected },
  });
}

function PromptInputSkill({
  action = "insert",
  desc,
  disabled = false,
  render,
  value,
  children,
  ...props
}: PromptInputSkillProps) {
  const { insertSkill, registerSkill, setFlyoutOpen } =
    usePromptInputContext("PromptInput.Skill");
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const name = typeof children === "string" ? children : value;

  React.useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    return registerSkill({
      action,
      desc,
      disabled,
      element: ref.current,
      id: value,
      name,
    });
  }, [action, desc, disabled, name, registerSkill, value]);

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        children,
        disabled,
        onClick: () => {
          if (disabled) {
            return;
          }
          if (action === "command") {
            // Consumer handles via onClick + defaultPrevented.
          }
          insertSkill(value);
          setFlyoutOpen(null);
        },
        onFocus: () => setFlyoutOpen("skills"),
        ref,
        role: "menuitem",
        type: "button",
      },
      props
    ),
    render,
    state: { disabled },
  });
}

function PromptInputSource({
  action,
  attach = false,
  connect = false,
  connected = false,
  desc,
  disabled = false,
  render,
  section,
  value,
  children,
  ...props
}: PromptInputSourceProps) {
  const { insertSource, registerSource, setFlyoutOpen } =
    usePromptInputContext("PromptInput.Source");
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const name = typeof children === "string" ? children : value;
  const resolvedSection = getSourceSection({ section });
  let resolvedAction = action;
  if (!resolvedAction) {
    if (attach) {
      resolvedAction = "attach";
    } else if (connect) {
      resolvedAction = "connect";
    } else {
      resolvedAction = "insert";
    }
  }

  React.useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    return registerSource({
      action: resolvedAction,
      attach,
      connect,
      connected,
      desc,
      disabled,
      element: ref.current,
      id: value,
      name,
      section: resolvedSection,
    });
  }, [
    attach,
    connect,
    connected,
    desc,
    disabled,
    name,
    registerSource,
    resolvedAction,
    resolvedSection,
    value,
  ]);

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        children,
        disabled,
        onClick: (event) => {
          if (disabled || event.defaultPrevented) {
            return;
          }
          insertSource(value);
          setFlyoutOpen(null);
        },
        onFocus: () => setFlyoutOpen("sources"),
        ref,
        role: "menuitem",
        type: "button",
      },
      props
    ),
    render,
    state: {
      attach,
      connect,
      connected,
      disabled,
      section: resolvedSection,
    },
  });
}

function PromptInputSlashPalette({
  children,
  render,
  ...props
}: PromptInputSlashPaletteProps) {
  const {
    listboxId,
    setSlashKeyboard,
    slashOpen,
    slashQuery,
    slashResults,
    slashKeyboard,
  } = usePromptInputContext("PromptInput.SlashPalette");

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        children:
          children ?? (slashResults.length === 0 ? "No results" : undefined),
        id: `${listboxId}-slash`,
        onMouseMove: () => {
          if (slashKeyboard) {
            setSlashKeyboard(false);
          }
        },
        role: "listbox",
      },
      props
    ),
    render,
    state: {
      empty: slashResults.length === 0,
      keyboard: slashKeyboard,
      open: slashOpen,
      query: slashQuery,
    },
  });

  if (!slashOpen) {
    return null;
  }

  return element;
}

function PromptInputAtPalette({
  children,
  render,
  ...props
}: PromptInputAtPaletteProps) {
  const { atKeyboard, atOpen, atQuery, atResults, listboxId, setAtKeyboard } =
    usePromptInputContext("PromptInput.AtPalette");

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        children:
          children ?? (atResults.length === 0 ? "No results" : undefined),
        id: `${listboxId}-at`,
        onMouseMove: () => {
          if (atKeyboard) {
            setAtKeyboard(false);
          }
        },
        role: "listbox",
      },
      props
    ),
    render,
    state: {
      empty: atResults.length === 0,
      keyboard: atKeyboard,
      open: atOpen,
      query: atQuery,
    },
  });

  if (!atOpen) {
    return null;
  }

  return element;
}

function PromptInputPaletteItem({
  disabled = false,
  render,
  value,
  ...props
}: PromptInputPaletteItemProps) {
  const context = usePromptInputContext("PromptInput.PaletteItem");
  const isSlash = context.slashOpen;
  const results = isSlash ? context.slashResults : context.atResults;
  const highlightedId = isSlash
    ? context.slashHighlightedId
    : context.atHighlightedId;
  const itemIndex = results.findIndex((item) => item.id === value);
  const highlighted = highlightedId === value;
  const optionId = `${context.listboxId}-${isSlash ? "slash" : "at"}-${value}`;

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        "aria-disabled": disabled || undefined,
        "aria-selected": highlighted,
        id: optionId,
        onClick: () => {
          if (disabled) {
            return;
          }
          if (isSlash) {
            context.applySlash(value);
          } else {
            context.applyAt(value);
          }
        },
        onMouseEnter: () => {
          if (context.slashKeyboard || context.atKeyboard) {
            return;
          }
          if (itemIndex !== -1) {
            if (isSlash) {
              context.setSlashIndex(itemIndex);
            } else {
              context.setAtIndex(itemIndex);
            }
          }
        },
        role: "option",
      },
      props
    ),
    render,
    state: { disabled, highlighted },
  });
}

export { PromptInputProvider } from "./context";
export {
  PromptInputAtPalette,
  PromptInputAttachment,
  PromptInputAttachmentRemove,
  PromptInputAttachments,
  PromptInputEditor,
  PromptInputFileInput,
  PromptInputFileTrigger,
  PromptInputLiveRegion,
  PromptInputMenu,
  PromptInputMenuContent,
  PromptInputMenuFlyout,
  PromptInputMenuFlyoutTrigger,
  PromptInputMenuTrigger,
  PromptInputModel,
  PromptInputPaletteItem,
  PromptInputReferencedSource,
  PromptInputReferencedSourceRemove,
  PromptInputReferencedSources,
  PromptInputRoot,
  PromptInputScreenshotTrigger,
  PromptInputSkill,
  PromptInputSlashPalette,
  PromptInputSource,
  PromptInputSubmit,
};
