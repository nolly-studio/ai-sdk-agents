import * as React from "react";

import { composeRefs } from "../use-render";
import {
  attachmentFromFile,
  createAttachmentId,
  filterIncomingFiles,
  revokeAllAttachmentPreviews,
  revokeAttachmentPreview,
} from "./attachments";
import {
  createPromptInputCollection,
  getCollectionRegistrationWarnings,
} from "./collection";
import { useOptionalPromptInputProvider } from "./context";
import {
  collectTokenIds,
  focusEditorEnd,
  rangeFromSavedOrEnd,
  saveEditorSelection,
  syncEditorValue,
} from "./editor";
import { captureScreenshot } from "./screenshot";
import {
  createDefaultTokenElement,
  insertTokenOverRange,
  removeTokenElement,
  removeTokenRange,
} from "./tokens";
import type {
  ModelRegistration,
  PromptInputAttachment,
  PromptInputAttachmentKind,
  PromptInputContextValue,
  PromptInputFlyoutId,
  PromptInputMessage,
  PromptInputReferencedSource,
  PromptInputRootProps,
  PromptInputRootState,
  PromptInputStatus,
  SkillRegistration,
  SourceRegistration,
} from "./types";
import { useTokenPalette } from "./use-token-palette";
import {
  AT_TOKEN_AFTER_BOUNDARY,
  AT_TOKEN_AT_CARET,
  isPaletteNavKey,
  resolveTriggers,
  SLASH_TOKEN_AFTER_BOUNDARY,
  SLASH_TOKEN_AT_CARET,
} from "./utils";

type UsePromptInputRootResult = {
  context: PromptInputContextValue;
  rootProps: React.ComponentPropsWithRef<"form">;
  state: PromptInputRootState;
};

function noop(): undefined {
  return undefined;
}

function resolveSourceAction(source: {
  action?: SourceRegistration["action"];
  attach?: boolean;
  connect?: boolean;
}): SourceRegistration["action"] {
  if (source.action) {
    return source.action;
  }
  if (source.attach) {
    return "attach";
  }
  if (source.connect) {
    return "connect";
  }
  return "insert";
}

function statusAnnouncement(status: PromptInputStatus): string {
  if (status === "submitted") {
    return "Message submitted";
  }
  if (status === "streaming") {
    return "Generating response";
  }
  if (status === "error") {
    return "An error occurred";
  }
  return "";
}

function resolveActiveDescendantId(options: {
  atHighlightedId: string | null;
  atOpen: boolean;
  listboxId: string;
  slashHighlightedId: string | null;
  slashOpen: boolean;
}): string | null {
  const { atHighlightedId, atOpen, listboxId, slashHighlightedId, slashOpen } =
    options;
  if (slashOpen) {
    return slashHighlightedId
      ? `${listboxId}-slash-${slashHighlightedId}`
      : null;
  }
  if (atOpen) {
    return atHighlightedId ? `${listboxId}-at-${atHighlightedId}` : null;
  }
  return null;
}

// Root hook intentionally orchestrates editor, attachments, palettes, and menus.
// oxlint-disable-next-line eslint/complexity -- composition root; splitting would obscure ownership
function usePromptInputRoot({
  accept,
  attachments: attachmentsProp,
  clearOnSubmit = true,
  createTokenElement = createDefaultTokenElement,
  defaultAttachments,
  defaultMenuOpen = false,
  defaultModelId,
  defaultReferencedSources = [],
  defaultValue = "",
  disabled = false,
  editorMode = "rich",
  globalDrop = false,
  maxFileSize,
  maxFiles,
  menuOpen: menuOpenProp,
  modelId: modelIdProp,
  models: modelDefinitions,
  multiline = true,
  onAttachmentsChange,
  onError,
  onMenuOpenChange,
  onModelChange,
  onReferencedSourcesChange,
  onStop,
  onSubmit,
  onTokenRemove,
  onValueChange,
  readonly = false,
  ref,
  referencedSources: referencedSourcesProp,
  skills: skillDefinitions,
  sources: sourceDefinitions,
  status = "ready",
  submitting = false,
  syncHiddenInput = false,
  triggers: triggerDefinitions,
  value: valueProp,
  ...props
}: PromptInputRootProps): UsePromptInputRootResult {
  const provider = useOptionalPromptInputProvider();
  const listboxId = React.useId();

  const [skillMap, setSkillMap] = React.useState(
    () => new Map<string, SkillRegistration>()
  );
  const [sourceMap, setSourceMap] = React.useState(
    () => new Map<string, SourceRegistration>()
  );
  const [modelMap, setModelMap] = React.useState(
    () => new Map<string, ModelRegistration>()
  );

  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    () => provider?.value ?? defaultValue
  );
  const [uncontrolledAttachments, setUncontrolledAttachments] = React.useState<
    PromptInputAttachment[]
  >(() => provider?.attachments ?? defaultAttachments ?? []);
  const [uncontrolledModelId, setUncontrolledModelId] = React.useState<
    string | null
  >(
    () =>
      provider?.modelId ?? defaultModelId ?? modelDefinitions?.[0]?.id ?? null
  );
  const [uncontrolledReferencedSources, setUncontrolledReferencedSources] =
    React.useState<PromptInputReferencedSource[]>(defaultReferencedSources);
  const [uncontrolledMenuOpen, setUncontrolledMenuOpen] =
    React.useState(defaultMenuOpen);
  const [flyoutOpen, setFlyoutOpenState] =
    React.useState<PromptInputFlyoutId | null>(null);
  const [internalSubmitting, setInternalSubmitting] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const flyoutCloseTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const value = valueProp ?? provider?.value ?? uncontrolledValue;
  const attachments =
    attachmentsProp ?? provider?.attachments ?? uncontrolledAttachments;
  const modelId = modelIdProp ?? provider?.modelId ?? uncontrolledModelId;
  const referencedSources =
    referencedSourcesProp ?? uncontrolledReferencedSources;
  const menuOpen = menuOpenProp ?? uncontrolledMenuOpen;
  const isSubmitting = submitting || internalSubmitting;
  const tokensEnabled = editorMode === "rich";

  const editorRef = React.useRef<HTMLElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const menuTriggerRef = React.useRef<HTMLElement | null>(null);
  const menuContentRef = React.useRef<HTMLElement | null>(null);
  const savedRange = React.useRef<Range | null>(null);
  const nextAttachmentId = React.useRef(1);
  const ignoreHoverRef = React.useRef(false);
  const attachmentsRef = React.useRef(attachments);
  const paletteKeyLock = React.useRef(false);
  const applySlashRef = React.useRef<(id: string) => void>(noop);
  const applyAtRef = React.useRef<(id: string) => void>(noop);
  const handlePaletteKeyRef = React.useRef<(event: KeyboardEvent) => boolean>(
    () => false
  );

  React.useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  React.useEffect(
    () => () => {
      revokeAllAttachmentPreviews(attachmentsRef.current);
    },
    []
  );

  const setValue = React.useCallback(
    (next: string) => {
      if (valueProp === undefined && !provider) {
        setUncontrolledValue(next);
      }
      provider?.setValue(next);
      onValueChange?.(next);
    },
    [onValueChange, provider, valueProp]
  );

  const setAttachments = React.useCallback(
    (next: PromptInputAttachment[]) => {
      if (attachmentsProp === undefined && !provider) {
        setUncontrolledAttachments(next);
      }
      provider?.setAttachments(next);
      onAttachmentsChange?.(next);
    },
    [attachmentsProp, onAttachmentsChange, provider]
  );

  const setModelId = React.useCallback(
    (next: string) => {
      if (modelIdProp === undefined && !provider) {
        setUncontrolledModelId(next);
      }
      provider?.setModelId(next);
      onModelChange?.(next);
    },
    [modelIdProp, onModelChange, provider]
  );

  const setReferencedSources = React.useCallback(
    (next: PromptInputReferencedSource[]) => {
      if (referencedSourcesProp === undefined) {
        setUncontrolledReferencedSources(next);
      }
      onReferencedSourcesChange?.(next);
    },
    [onReferencedSourcesChange, referencedSourcesProp]
  );

  const setMenuOpen = React.useCallback(
    (next: boolean) => {
      if (menuOpenProp === undefined) {
        setUncontrolledMenuOpen(next);
      }
      onMenuOpenChange?.(next);
      if (!next) {
        setFlyoutOpenState(null);
      }
    },
    [menuOpenProp, onMenuOpenChange]
  );

  const keepFlyoutOpen = React.useCallback((name: PromptInputFlyoutId) => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
    setFlyoutOpenState(name);
  }, []);

  const scheduleFlyoutClose = React.useCallback(() => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
    }
    flyoutCloseTimerRef.current = setTimeout(() => {
      setFlyoutOpenState(null);
      flyoutCloseTimerRef.current = null;
    }, 160);
  }, []);

  const setFlyoutOpen = React.useCallback(
    (name: PromptInputFlyoutId | null) => {
      if (name) {
        keepFlyoutOpen(name);
        return;
      }
      scheduleFlyoutClose();
    },
    [keepFlyoutOpen, scheduleFlyoutClose]
  );

  const announce = React.useCallback((message: string) => {
    setAnnouncement("");
    queueMicrotask(() => setAnnouncement(message));
  }, []);

  const reportError = React.useCallback(
    (error: Parameters<NonNullable<PromptInputRootProps["onError"]>>[0]) => {
      announce(error.message);
      onError?.(error);
    },
    [announce, onError]
  );

  const skills = React.useMemo(() => [...skillMap.values()], [skillMap]);
  const sources = React.useMemo(() => [...sourceMap.values()], [sourceMap]);
  const models = React.useMemo(() => [...modelMap.values()], [modelMap]);

  const schemaSkills = React.useMemo((): SkillRegistration[] => {
    if (skillDefinitions) {
      return skillDefinitions.map((skill) => ({
        action: skill.action ?? "insert",
        desc: skill.desc,
        disabled: Boolean(skill.disabled),
        element: null as unknown as HTMLElement,
        id: skill.id,
        name: skill.name,
      }));
    }
    return skills;
  }, [skillDefinitions, skills]);

  const schemaSources = React.useMemo((): SourceRegistration[] => {
    if (sourceDefinitions) {
      return sourceDefinitions.map((source) => ({
        action: resolveSourceAction(source),
        attach: Boolean(source.attach),
        connect: Boolean(source.connect),
        connected: Boolean(source.connected),
        desc: source.desc,
        disabled: Boolean(source.disabled),
        element: null as unknown as HTMLElement,
        id: source.id,
        name: source.name,
        section: source.section ?? "add",
      }));
    }
    return sources;
  }, [sourceDefinitions, sources]);

  const getEditor = React.useCallback(() => editorRef.current, []);
  const triggers = React.useMemo(
    () => resolveTriggers(triggerDefinitions),
    [triggerDefinitions]
  );
  const slashTrigger =
    triggers.find((trigger) => trigger.id === "slash") ??
    triggers.find((trigger) => trigger.catalog === "skill") ??
    triggers[0];
  const atTrigger =
    triggers.find((trigger) => trigger.id === "at") ??
    triggers.find((trigger) => trigger.catalog === "source") ??
    triggers[1];

  const closeAtRef = React.useRef<() => void>(noop);

  const slash = useTokenPalette<SkillRegistration>({
    boundaryPattern:
      slashTrigger?.boundaryPattern ?? SLASH_TOKEN_AFTER_BOUNDARY,
    getEditor,
    ignoreHoverRef,
    items: schemaSkills,
    onOpen: () => closeAtRef.current(),
  });

  const at = useTokenPalette<SourceRegistration>({
    boundaryPattern: atTrigger?.boundaryPattern ?? AT_TOKEN_AFTER_BOUNDARY,
    getEditor,
    ignoreHoverRef,
    items: schemaSources,
    onOpen: () => slash.close(),
    suppressWhen: atTrigger?.suppressWhen,
  });
  closeAtRef.current = at.close;

  const syncFromEditor = React.useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    syncEditorValue(editor, setValue);
  }, [setValue]);

  const focusEnd = React.useCallback(() => {
    const editor = editorRef.current;
    if (!editor || disabled || readonly) {
      return;
    }
    focusEditorEnd(editor, savedRange);
  }, [disabled, readonly]);

  const saveSelection = React.useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    saveEditorSelection(editor, savedRange);
  }, []);

  const closePalettes = React.useCallback(() => {
    slash.close();
    at.close();
  }, [at, slash]);

  const insertToken = React.useCallback(
    (type: "skill" | "source", id: string, label: string, range: Range) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      const token = createTokenElement({ id, label, type });
      insertTokenOverRange(editor, range, token, savedRange, syncFromEditor);
    },
    [createTokenElement, syncFromEditor]
  );

  const insertSkill = React.useCallback(
    (id: string) => {
      const editor = editorRef.current;
      if (!editor || disabled || readonly) {
        return;
      }
      const skill =
        schemaSkills.find((item) => item.id === id) ??
        skills.find((item) => item.id === id);
      if (!skill || skill.disabled) {
        return;
      }
      const range = rangeFromSavedOrEnd(editor, savedRange);
      if (!range) {
        return;
      }
      insertToken("skill", id, skill.name, range);
      setMenuOpen(false);
    },
    [disabled, insertToken, readonly, schemaSkills, setMenuOpen, skills]
  );

  const openFileDialog = React.useCallback(
    (kind: PromptInputAttachmentKind = "file") => {
      const input = fileInputRef.current;
      if (!input || disabled || readonly) {
        return;
      }
      input.accept =
        kind === "image" ? "image/*" : (accept ?? input.accept ?? "");
      input.value = "";
      input.dataset.kind = kind;
      input.click();
      setMenuOpen(false);
    },
    [accept, disabled, readonly, setMenuOpen]
  );

  const insertSource = React.useCallback(
    (id: string) => {
      const source =
        schemaSources.find((item) => item.id === id) ??
        sources.find((item) => item.id === id);
      if (!source || source.disabled) {
        return;
      }
      if (source.attach || source.action === "attach") {
        openFileDialog("file");
        return;
      }
      const editor = editorRef.current;
      if (!editor || disabled || readonly) {
        return;
      }
      const range = rangeFromSavedOrEnd(editor, savedRange);
      if (!range) {
        return;
      }
      insertToken("source", id, source.name, range);
      setMenuOpen(false);
    },
    [
      disabled,
      insertToken,
      openFileDialog,
      readonly,
      schemaSources,
      setMenuOpen,
      sources,
    ]
  );

  const applySlash = React.useCallback(
    (id: string) => {
      const editor = editorRef.current;
      const skill = schemaSkills.find((item) => item.id === id);
      if (!(editor && skill) || skill.disabled) {
        slash.close();
        return;
      }
      const range = removeTokenRange(
        editor,
        slash.tokenRef,
        slashTrigger?.caretPattern ?? SLASH_TOKEN_AT_CARET
      );
      if (!range) {
        slash.close();
        return;
      }
      insertToken("skill", id, skill.name, range);
      slash.close();
    },
    [insertToken, schemaSkills, slash, slashTrigger?.caretPattern]
  );
  applySlashRef.current = applySlash;

  const applyAt = React.useCallback(
    (id: string) => {
      const editor = editorRef.current;
      const source = schemaSources.find((item) => item.id === id);
      const range = editor
        ? removeTokenRange(
            editor,
            at.tokenRef,
            atTrigger?.caretPattern ?? AT_TOKEN_AT_CARET
          )
        : null;

      if (!source || source.disabled) {
        at.close();
        return;
      }

      if (source.attach || source.action === "attach") {
        if (range) {
          range.deleteContents();
          syncFromEditor();
        }
        at.close();
        openFileDialog("file");
        return;
      }

      if (!(editor && range)) {
        at.close();
        return;
      }

      insertToken("source", id, source.name, range);
      at.close();
    },
    [
      at,
      atTrigger?.caretPattern,
      insertToken,
      openFileDialog,
      schemaSources,
      syncFromEditor,
    ]
  );
  applyAtRef.current = applyAt;

  const addFiles = React.useCallback(
    (
      files: FileList | File[],
      fallbackKind: PromptInputAttachmentKind = "file"
    ) => {
      if (disabled || readonly) {
        return;
      }
      const nextFiles = filterIncomingFiles({
        accept,
        currentCount: attachments.length,
        files,
        maxFileSize,
        maxFiles,
        onError: reportError,
      });
      if (!nextFiles.length) {
        return;
      }
      setAttachments([
        ...attachments,
        ...nextFiles.map((file) =>
          attachmentFromFile(
            file,
            createAttachmentId(nextAttachmentId),
            fallbackKind
          )
        ),
      ]);
      announce(
        nextFiles.length === 1
          ? `Attached ${nextFiles[0]?.name}`
          : `Attached ${nextFiles.length} files`
      );
      requestAnimationFrame(focusEnd);
    },
    [
      accept,
      announce,
      attachments,
      disabled,
      focusEnd,
      maxFileSize,
      maxFiles,
      readonly,
      reportError,
      setAttachments,
    ]
  );

  const addReferencedSource = React.useCallback(
    (source: PromptInputReferencedSource) => {
      if (referencedSources.some((item) => item.id === source.id)) {
        return;
      }
      setReferencedSources([...referencedSources, source]);
      announce(`Referenced ${source.title ?? source.filename ?? source.id}`);
    },
    [announce, referencedSources, setReferencedSources]
  );

  const removeReferencedSource = React.useCallback(
    (id: string) => {
      setReferencedSources(
        referencedSources.filter((source) => source.id !== id)
      );
    },
    [referencedSources, setReferencedSources]
  );

  const captureAndAttachScreenshot = React.useCallback(async () => {
    if (disabled || readonly) {
      return;
    }
    const file = await captureScreenshot();
    if (!file) {
      announce("Screenshot capture cancelled");
      return;
    }
    addFiles([file], "image");
  }, [addFiles, announce, disabled, readonly]);

  const removeAttachment = React.useCallback(
    (id: string) => {
      const found = attachments.find((item) => item.id === id);
      if (found) {
        revokeAttachmentPreview(found);
      }
      setAttachments(attachments.filter((item) => item.id !== id));
    },
    [attachments, setAttachments]
  );

  const clearAttachments = React.useCallback(() => {
    revokeAllAttachmentPreviews(attachments);
    setAttachments([]);
  }, [attachments, setAttachments]);

  const buildMessage = React.useCallback((): PromptInputMessage => {
    const editor = editorRef.current;
    return {
      attachments,
      modelId,
      referencedSources,
      skillIds: tokensEnabled ? collectTokenIds(editor, "skill") : [],
      sourceIds: tokensEnabled ? collectTokenIds(editor, "source") : [],
      text: value.trim(),
    };
  }, [attachments, modelId, referencedSources, tokensEnabled, value]);

  const clear = React.useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      if (editorMode === "plain" && editor instanceof HTMLTextAreaElement) {
        editor.value = "";
      } else {
        editor.innerHTML = "";
      }
    }
    setValue("");
    clearAttachments();
    setReferencedSources([]);
    closePalettes();
    requestAnimationFrame(focusEnd);
  }, [
    clearAttachments,
    closePalettes,
    editorMode,
    focusEnd,
    setReferencedSources,
    setValue,
  ]);

  const submit = React.useCallback(() => {
    // Prefer form requestSubmit so onSubmit handlers run with an event.
    const editor = editorRef.current;
    const form = editor?.closest("form");
    if (form) {
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
      }
    }
  }, []);

  const stop = React.useCallback(() => {
    onStop?.();
  }, [onStop]);

  const removeTokenNearest = React.useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return;
      }
      const remove = target.closest("[data-remove]");
      if (!remove) {
        return;
      }
      const pill = remove.closest<HTMLElement>(
        "[data-skill], [data-source], [data-token]"
      );
      if (!pill) {
        return;
      }
      const commit = () => {
        removeTokenElement(pill, syncFromEditor);
        editorRef.current?.focus();
      };
      if (onTokenRemove) {
        onTokenRemove(pill, commit);
        return;
      }
      commit();
    },
    [onTokenRemove, syncFromEditor]
  );

  const handlePaletteKey = React.useCallback(
    (event: {
      key: string;
      preventDefault: () => void;
      stopPropagation?: () => void;
    }) => {
      const slashActive = slash.openRef.current;
      const atActive = at.openRef.current;
      if (!(slashActive || atActive)) {
        return false;
      }
      if (!isPaletteNavKey(event.key)) {
        return false;
      }
      event.preventDefault();
      event.stopPropagation?.();
      if (event.key === "Escape") {
        closePalettes();
        return true;
      }
      const results = slashActive
        ? slash.resultsRef.current
        : at.resultsRef.current;
      if (!results.length || paletteKeyLock.current) {
        return true;
      }
      paletteKeyLock.current = true;
      queueMicrotask(() => {
        paletteKeyLock.current = false;
      });
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        if (slashActive) {
          slash.move(delta);
        } else {
          at.move(delta);
        }
        return true;
      }
      const index = slashActive ? slash.indexRef.current : at.indexRef.current;
      const apply = slashActive ? applySlashRef : applyAtRef;
      const selected = results[index] ?? results[0];
      if (!selected) {
        return true;
      }
      apply.current(selected.id);
      return true;
    },
    [at, closePalettes, slash]
  );
  handlePaletteKeyRef.current = handlePaletteKey;

  React.useEffect(() => {
    if (!(slash.open || at.open)) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      handlePaletteKeyRef.current(event);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [at.open, slash.open]);

  React.useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuTriggerRef.current?.contains(target) ||
        menuContentRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, setMenuOpen]);

  React.useEffect(() => {
    if (!globalDrop || disabled || readonly) {
      return;
    }
    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
      }
    };
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.files?.length) {
        return;
      }
      event.preventDefault();
      addFiles(event.dataTransfer.files);
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [addFiles, disabled, globalDrop, readonly]);

  React.useEffect(() => {
    if (status === "ready") {
      return;
    }
    announce(statusAnnouncement(status));
  }, [announce, status]);

  React.useEffect(
    () => () => {
      if (flyoutCloseTimerRef.current) {
        clearTimeout(flyoutCloseTimerRef.current);
      }
    },
    []
  );

  const collection = React.useMemo(
    () =>
      createPromptInputCollection({
        models: modelDefinitions,
        skills: skillDefinitions,
        sources: sourceDefinitions,
      }),
    [modelDefinitions, skillDefinitions, sourceDefinitions]
  );

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !collection) {
      return;
    }
    const warnings = getCollectionRegistrationWarnings(collection, {
      models,
      skills,
      sources,
    });
    for (const warning of warnings) {
      console.warn(warning);
    }
  }, [collection, models, skills, sources]);

  const registerSkill = React.useCallback((registration: SkillRegistration) => {
    setSkillMap((prev) => new Map(prev).set(registration.id, registration));
    return () => {
      setSkillMap((prev) => {
        const next = new Map(prev);
        next.delete(registration.id);
        return next;
      });
    };
  }, []);

  const registerSource = React.useCallback(
    (registration: SourceRegistration) => {
      setSourceMap((prev) => new Map(prev).set(registration.id, registration));
      return () => {
        setSourceMap((prev) => {
          const next = new Map(prev);
          next.delete(registration.id);
          return next;
        });
      };
    },
    []
  );

  const registerModel = React.useCallback((registration: ModelRegistration) => {
    setModelMap((prev) => new Map(prev).set(registration.id, registration));
    return () => {
      setModelMap((prev) => {
        const next = new Map(prev);
        next.delete(registration.id);
        return next;
      });
    };
  }, []);

  const empty = value.trim().length === 0;
  const hasAttachments = attachments.length > 0;
  const ready = !empty || hasAttachments;
  const resolvedStatus: PromptInputStatus = isSubmitting ? "submitted" : status;

  const state: PromptInputRootState = {
    atOpen: tokensEnabled && at.open,
    disabled,
    empty,
    hasAttachments,
    menuOpen,
    ready,
    readonly,
    slashOpen: tokensEnabled && slash.open,
    status: resolvedStatus,
    submitting: isSubmitting,
  };

  const slashHighlightedId = slash.results[slash.index]?.id ?? null;
  const atHighlightedId = at.results[at.index]?.id ?? null;
  const activeDescendantId = resolveActiveDescendantId({
    atHighlightedId,
    atOpen: at.open,
    listboxId,
    slashHighlightedId,
    slashOpen: slash.open,
  });

  const context: PromptInputContextValue = {
    ...state,
    accept,
    activeDescendantId: tokensEnabled ? activeDescendantId : null,
    addFiles,
    addReferencedSource,
    announcement,
    applyAt,
    applySlash,
    atHighlightedId,
    atIndex: at.index,
    atKeyboard: at.keyboard,
    atOpen: tokensEnabled && at.open,
    atQuery: at.query,
    atResults: at.results,
    attachments,
    captureAndAttachScreenshot,
    clear,
    closeMenu: () => setMenuOpen(false),
    closePalettes,
    editorMode,
    flyoutOpen,
    focusEditorEnd: focusEnd,
    getEditor,
    insertSkill,
    insertSource,
    keepFlyoutOpen,
    listboxId,
    maxFileSize,
    maxFiles,
    menuContentRef,
    menuOpen,
    menuTriggerRef,
    modelId,
    models,
    moveAt: at.move,
    moveSlash: slash.move,
    multiline,
    openFileDialog,
    openMenu: () => setMenuOpen(true),
    referencedSources,
    registerEditor: (element) => {
      editorRef.current = element;
    },
    registerFileInput: (element) => {
      fileInputRef.current = element;
    },
    registerModel,
    registerSkill,
    registerSource,
    removeAttachment,
    removeReferencedSource,
    removeTokenNearest,
    saveSelection,
    scheduleFlyoutClose,
    selectModel: setModelId,
    setAtIndex: at.setIndex,
    setAtKeyboard: at.setKeyboard,
    setFlyoutOpen,
    setSlashIndex: slash.setIndex,
    setSlashKeyboard: slash.setKeyboard,
    setValueFromPlainEditor: setValue,
    skills,
    slashHighlightedId,
    slashIndex: slash.index,
    slashKeyboard: slash.keyboard,
    slashOpen: tokensEnabled && slash.open,
    slashQuery: slash.query,
    slashResults: slash.results,
    sources,
    status: resolvedStatus,
    stop,
    submit,
    syncFromEditor: () => {
      syncFromEditor();
      if (menuOpen) {
        setMenuOpen(false);
      }
      if (tokensEnabled) {
        slash.detect();
        at.detect();
      }
    },
    syncHiddenInput,
    toggleMenu: () => setMenuOpen(!menuOpen),
    value,
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    if (disabled || readonly || !ready || isSubmitting) {
      event.preventDefault();
      return;
    }

    const message = buildMessage();
    const result = onSubmit?.(event, message);
    // Consumer preventDefault cancels built-in clear; we still stop navigation.
    const cancelled = event.defaultPrevented;
    event.preventDefault();

    if (cancelled || !clearOnSubmit) {
      return;
    }

    if (result && typeof (result as Promise<void>).then === "function") {
      setInternalSubmitting(true);
      try {
        await result;
        clear();
      } finally {
        setInternalSubmitting(false);
      }
      return;
    }

    clear();
  };

  const handleDragOver = (event: React.DragEvent<HTMLFormElement>) => {
    if (disabled || readonly) {
      return;
    }
    if (event.dataTransfer?.types.includes("Files")) {
      event.preventDefault();
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLFormElement>) => {
    if (disabled || readonly) {
      return;
    }
    if (!event.dataTransfer?.files?.length) {
      return;
    }
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  return {
    context,
    rootProps: {
      ...props,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onSubmit: handleSubmit,
      ref: composeRefs(ref, (node) => {
        // keep for future root measurements
        void node;
      }),
    },
    state,
  };
}

export type { UsePromptInputRootResult };
export { usePromptInputRoot };
