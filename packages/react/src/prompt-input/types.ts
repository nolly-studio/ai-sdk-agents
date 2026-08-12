import type * as React from "react";

import type { UseRenderComponentProps } from "../use-render";

// ---------------------------------------------------------------------------
// Catalog definitions (optional schema)
// ---------------------------------------------------------------------------

type PromptInputItemAction =
  | "attach"
  | "command"
  | "connect"
  | "insert"
  | "select";

type PromptInputSourceSection = "add" | "plugins";

type PromptInputSkillDefinition = {
  action?: PromptInputItemAction;
  desc?: string;
  disabled?: boolean;
  id: string;
  name: string;
};

type PromptInputSourceDefinition = {
  action?: PromptInputItemAction;
  attach?: boolean;
  connect?: boolean;
  connected?: boolean;
  desc?: string;
  disabled?: boolean;
  id: string;
  name: string;
  section?: PromptInputSourceSection;
};

type PromptInputModelDefinition = {
  context?: string;
  desc?: string;
  disabled?: boolean;
  id: string;
  name: string;
};

type PromptInputTriggerDefinition = {
  /** Catalog this trigger filters (`skill` | `source` | custom id). */
  catalog: string;
  /** Match query at caret when applying a selection. */
  caretPattern: RegExp;
  /** Match trigger+query after a boundary while typing. */
  boundaryPattern: RegExp;
  id: string;
  /** When this matches at caret, keep this trigger closed. */
  suppressWhen?: RegExp;
};

// ---------------------------------------------------------------------------
// Message / attachments / status
// ---------------------------------------------------------------------------

type PromptInputAttachmentKind = "file" | "image";

type PromptInputAttachment = {
  file?: File;
  id: string;
  kind: PromptInputAttachmentKind;
  name: string;
  preview?: string | null;
};

type PromptInputReferencedSource = {
  filename?: string;
  id: string;
  mediaType?: string;
  title?: string;
  url?: string;
};

type PromptInputMessage = {
  attachments: PromptInputAttachment[];
  modelId: string | null;
  referencedSources: PromptInputReferencedSource[];
  skillIds: string[];
  sourceIds: string[];
  text: string;
};

type PromptInputEditorMode = "plain" | "rich";

type PromptInputStatus = "error" | "ready" | "streaming" | "submitted";

type PromptInputAttachmentErrorCode = "accept" | "max_file_size" | "max_files";

type PromptInputAttachmentError = {
  code: PromptInputAttachmentErrorCode;
  message: string;
};

/** Any string while preserving autocomplete for known token kinds. */
type PromptInputTokenTypeName = "skill" | "source" | (string & { _?: never });

type CreateTokenElementOptions = {
  id: string;
  label: string;
  type: PromptInputTokenTypeName;
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

type PromptInputRootState = {
  atOpen: boolean;
  disabled: boolean;
  empty: boolean;
  hasAttachments: boolean;
  menuOpen: boolean;
  ready: boolean;
  readonly: boolean;
  slashOpen: boolean;
  status: PromptInputStatus;
  submitting: boolean;
};

type PromptInputRootProps = Omit<
  React.ComponentPropsWithRef<"form">,
  "defaultValue" | "onSubmit" | "value"
> & {
  accept?: string;
  attachments?: PromptInputAttachment[];
  clearOnSubmit?: boolean;
  createTokenElement?: (options: CreateTokenElementOptions) => HTMLElement;
  defaultAttachments?: PromptInputAttachment[];
  defaultMenuOpen?: boolean;
  defaultModelId?: string;
  defaultReferencedSources?: PromptInputReferencedSource[];
  defaultValue?: string;
  disabled?: boolean;
  /** `rich` = contenteditable + tokens; `plain` = textarea (no pills). */
  editorMode?: PromptInputEditorMode;
  /** When true, accept file drops on `document` (not only the form). */
  globalDrop?: boolean;
  maxFileSize?: number;
  maxFiles?: number;
  menuOpen?: boolean;
  modelId?: string;
  models?: readonly PromptInputModelDefinition[];
  /** When false, Enter always submits (no Shift+Enter newline). @default true */
  multiline?: boolean;
  onAttachmentsChange?: (attachments: PromptInputAttachment[]) => void;
  onError?: (error: PromptInputAttachmentError) => void;
  onMenuOpenChange?: (open: boolean) => void;
  onModelChange?: (modelId: string) => void;
  onReferencedSourcesChange?: (sources: PromptInputReferencedSource[]) => void;
  onStop?: () => void;
  onSubmit?: (
    event: React.FormEvent<HTMLFormElement>,
    message: PromptInputMessage
  ) => void | Promise<void>;
  /**
   * Skin IoC: animate token removal, then call `commit()` to detach the pill
   * and sync editor value. Defaults to immediate remove.
   */
  onTokenRemove?: (pill: HTMLElement, commit: () => void) => void;
  onValueChange?: (value: string) => void;
  readonly?: boolean;
  referencedSources?: PromptInputReferencedSource[];
  skills?: readonly PromptInputSkillDefinition[];
  sources?: readonly PromptInputSourceDefinition[];
  status?: PromptInputStatus;
  submitting?: boolean;
  /**
   * Mirror message fields into hidden inputs for native FormData posts
   * (`message`, `modelId`, `skillIds`, `sourceIds`, `referencedSources`).
   */
  syncHiddenInput?: boolean;
  triggers?: readonly PromptInputTriggerDefinition[];
  value?: string;
};

// ---------------------------------------------------------------------------
// Part props / state
// ---------------------------------------------------------------------------

type PromptInputEditorState = {
  disabled: boolean;
  empty: boolean;
  mode: PromptInputEditorMode;
  multiline: boolean;
  readonly: boolean;
};

type PromptInputEditorProps = Omit<
  UseRenderComponentProps<"div", PromptInputEditorState>,
  "children"
> &
  Omit<React.ComponentPropsWithRef<"textarea">, "children"> & {
    name?: string;
    placeholder?: string;
  };

type PromptInputLiveRegionState = {
  status: PromptInputStatus;
};

type PromptInputLiveRegionProps = UseRenderComponentProps<
  "div",
  PromptInputLiveRegionState
>;

type PromptInputScreenshotTriggerState = {
  disabled: boolean;
};

type PromptInputScreenshotTriggerProps = UseRenderComponentProps<
  "button",
  PromptInputScreenshotTriggerState
>;

type PromptInputReferencedSourcesState = {
  count: number;
};

type PromptInputReferencedSourcesProps = UseRenderComponentProps<
  "div",
  PromptInputReferencedSourcesState
>;

type PromptInputReferencedSourceState = {
  hasUrl: boolean;
};

type PromptInputReferencedSourceProps = UseRenderComponentProps<
  "div",
  PromptInputReferencedSourceState
> & {
  id: string;
};

type PromptInputReferencedSourceRemoveProps =
  UseRenderComponentProps<"button"> & {
    label?: string;
  };

type PromptInputSubmitState = {
  disabled: boolean;
  ready: boolean;
  status: PromptInputStatus;
  stoppable: boolean;
};

type PromptInputSubmitProps = UseRenderComponentProps<
  "button",
  PromptInputSubmitState
>;

type PromptInputMenuState = {
  open: boolean;
};

type PromptInputMenuProps = UseRenderComponentProps<
  "div",
  PromptInputMenuState
>;

type PromptInputMenuTriggerState = {
  disabled: boolean;
  open: boolean;
};

type PromptInputMenuTriggerProps = UseRenderComponentProps<
  "button",
  PromptInputMenuTriggerState
>;

type PromptInputMenuContentState = {
  open: boolean;
};

type PromptInputMenuContentProps = UseRenderComponentProps<
  "div",
  PromptInputMenuContentState
>;

type PromptInputFlyoutId = "skills" | "sources" | (string & { _?: never });

type PromptInputMenuFlyoutState = {
  open: boolean;
};

type PromptInputMenuFlyoutProps = UseRenderComponentProps<
  "div",
  PromptInputMenuFlyoutState
> & {
  /** Render an invisible pointer bridge toward the parent trigger. @default true */
  bridge?: boolean;
  name: PromptInputFlyoutId;
};

type PromptInputMenuFlyoutTriggerProps = UseRenderComponentProps<"div"> & {
  name: PromptInputFlyoutId;
};

type PromptInputFileInputProps = Omit<
  UseRenderComponentProps<"input">,
  "multiple" | "type"
> & {
  kind?: PromptInputAttachmentKind;
};

type PromptInputFileTriggerState = {
  disabled: boolean;
};

type PromptInputFileTriggerProps = UseRenderComponentProps<
  "button",
  PromptInputFileTriggerState
> & {
  kind?: PromptInputAttachmentKind;
};

type PromptInputAttachmentsState = {
  count: number;
};

type PromptInputAttachmentsProps = UseRenderComponentProps<
  "div",
  PromptInputAttachmentsState
>;

type PromptInputAttachmentState = {
  kind: PromptInputAttachmentKind;
};

type PromptInputAttachmentProps = UseRenderComponentProps<
  "div",
  PromptInputAttachmentState
> & {
  id: string;
};

type PromptInputAttachmentRemoveProps = UseRenderComponentProps<"button"> & {
  label?: string;
};

type PromptInputModelState = {
  disabled: boolean;
  selected: boolean;
};

type PromptInputModelProps = UseRenderComponentProps<
  "button",
  PromptInputModelState
> & {
  disabled?: boolean;
  value: string;
};

type PromptInputSkillState = {
  disabled: boolean;
};

type PromptInputSkillProps = UseRenderComponentProps<
  "button",
  PromptInputSkillState
> & {
  action?: PromptInputItemAction;
  desc?: string;
  disabled?: boolean;
  value: string;
};

type PromptInputSourceState = {
  attach: boolean;
  connect: boolean;
  connected: boolean;
  disabled: boolean;
  section: PromptInputSourceSection;
};

type PromptInputSourceProps = UseRenderComponentProps<
  "button",
  PromptInputSourceState
> & {
  action?: PromptInputItemAction;
  attach?: boolean;
  connect?: boolean;
  connected?: boolean;
  desc?: string;
  disabled?: boolean;
  section?: PromptInputSourceSection;
  value: string;
};

type PromptInputPaletteState = {
  empty: boolean;
  keyboard: boolean;
  open: boolean;
  query: string;
};

type PromptInputSlashPaletteProps = UseRenderComponentProps<
  "div",
  PromptInputPaletteState
>;

type PromptInputAtPaletteProps = UseRenderComponentProps<
  "div",
  PromptInputPaletteState
>;

type PromptInputPaletteItemState = {
  disabled: boolean;
  highlighted: boolean;
};

type PromptInputPaletteItemProps = UseRenderComponentProps<
  "div",
  PromptInputPaletteItemState
> & {
  disabled?: boolean;
  value: string;
};

// ---------------------------------------------------------------------------
// Registrations / context
// ---------------------------------------------------------------------------

type SkillRegistration = {
  action: PromptInputItemAction;
  desc?: string;
  disabled: boolean;
  element: HTMLElement;
  id: string;
  name: string;
};

type SourceRegistration = {
  action: PromptInputItemAction;
  attach: boolean;
  connect: boolean;
  connected: boolean;
  desc?: string;
  disabled: boolean;
  element: HTMLElement;
  id: string;
  name: string;
  section: PromptInputSourceSection;
};

type ModelRegistration = {
  disabled: boolean;
  element: HTMLElement;
  id: string;
  name: string;
};

type PromptInputContextValue = PromptInputRootState & {
  accept: string | undefined;
  activeDescendantId: string | null;
  addFiles: (
    files: FileList | File[],
    fallbackKind?: PromptInputAttachmentKind
  ) => void;
  addReferencedSource: (source: PromptInputReferencedSource) => void;
  announcement: string;
  applyAt: (id: string) => void;
  applySlash: (id: string) => void;
  atHighlightedId: string | null;
  atIndex: number;
  atKeyboard: boolean;
  atOpen: boolean;
  atQuery: string;
  atResults: SourceRegistration[];
  attachments: PromptInputAttachment[];
  captureAndAttachScreenshot: () => Promise<void>;
  clear: () => void;
  closeMenu: () => void;
  closePalettes: () => void;
  editorMode: PromptInputEditorMode;
  flyoutOpen: PromptInputFlyoutId | null;
  focusEditorEnd: () => void;
  getEditor: () => HTMLElement | null;
  insertSkill: (id: string) => void;
  insertSource: (id: string) => void;
  keepFlyoutOpen: (name: PromptInputFlyoutId) => void;
  listboxId: string;
  maxFileSize: number | undefined;
  maxFiles: number | undefined;
  menuContentRef: React.MutableRefObject<HTMLElement | null>;
  menuOpen: boolean;
  menuTriggerRef: React.MutableRefObject<HTMLElement | null>;
  modelId: string | null;
  models: readonly ModelRegistration[];
  moveAt: (delta: number) => void;
  moveSlash: (delta: number) => void;
  multiline: boolean;
  openFileDialog: (kind?: PromptInputAttachmentKind) => void;
  openMenu: () => void;
  referencedSources: PromptInputReferencedSource[];
  registerEditor: (element: HTMLElement | null) => void;
  registerFileInput: (element: HTMLInputElement | null) => void;
  registerModel: (registration: ModelRegistration) => () => void;
  registerSkill: (registration: SkillRegistration) => () => void;
  registerSource: (registration: SourceRegistration) => () => void;
  removeAttachment: (id: string) => void;
  removeReferencedSource: (id: string) => void;
  removeTokenNearest: (target: EventTarget | null) => void;
  saveSelection: () => void;
  scheduleFlyoutClose: () => void;
  selectModel: (id: string) => void;
  setAtIndex: (index: number) => void;
  setAtKeyboard: (keyboard: boolean) => void;
  setFlyoutOpen: (name: PromptInputFlyoutId | null) => void;
  setSlashIndex: (index: number) => void;
  setSlashKeyboard: (keyboard: boolean) => void;
  setValueFromPlainEditor: (next: string) => void;
  skills: readonly SkillRegistration[];
  slashHighlightedId: string | null;
  slashIndex: number;
  slashKeyboard: boolean;
  slashOpen: boolean;
  slashQuery: string;
  slashResults: SkillRegistration[];
  sources: readonly SourceRegistration[];
  status: PromptInputStatus;
  stop: () => void;
  submit: () => void;
  syncFromEditor: () => void;
  syncHiddenInput: boolean;
  toggleMenu: () => void;
  value: string;
};

type PromptInputProviderContextValue = {
  attachments: PromptInputAttachment[];
  modelId: string | null;
  setAttachments: (attachments: PromptInputAttachment[]) => void;
  setModelId: (modelId: string) => void;
  setValue: (value: string) => void;
  value: string;
};

export type {
  CreateTokenElementOptions,
  ModelRegistration,
  PromptInputAtPaletteProps,
  PromptInputAttachment,
  PromptInputAttachmentError,
  PromptInputAttachmentErrorCode,
  PromptInputAttachmentKind,
  PromptInputAttachmentProps,
  PromptInputAttachmentRemoveProps,
  PromptInputAttachmentState,
  PromptInputAttachmentsProps,
  PromptInputAttachmentsState,
  PromptInputContextValue,
  PromptInputEditorMode,
  PromptInputEditorProps,
  PromptInputEditorState,
  PromptInputFileInputProps,
  PromptInputFileTriggerProps,
  PromptInputFileTriggerState,
  PromptInputFlyoutId,
  PromptInputItemAction,
  PromptInputLiveRegionProps,
  PromptInputLiveRegionState,
  PromptInputMenuContentProps,
  PromptInputMenuContentState,
  PromptInputMenuFlyoutProps,
  PromptInputMenuFlyoutState,
  PromptInputMenuFlyoutTriggerProps,
  PromptInputMenuProps,
  PromptInputMenuState,
  PromptInputMenuTriggerProps,
  PromptInputMenuTriggerState,
  PromptInputMessage,
  PromptInputModelDefinition,
  PromptInputModelProps,
  PromptInputModelState,
  PromptInputPaletteItemProps,
  PromptInputPaletteItemState,
  PromptInputPaletteState,
  PromptInputProviderContextValue,
  PromptInputReferencedSource,
  PromptInputReferencedSourceProps,
  PromptInputReferencedSourceRemoveProps,
  PromptInputReferencedSourceState,
  PromptInputReferencedSourcesProps,
  PromptInputReferencedSourcesState,
  PromptInputRootProps,
  PromptInputRootState,
  PromptInputScreenshotTriggerProps,
  PromptInputScreenshotTriggerState,
  PromptInputSkillDefinition,
  PromptInputSkillProps,
  PromptInputSkillState,
  PromptInputSlashPaletteProps,
  PromptInputSourceDefinition,
  PromptInputSourceProps,
  PromptInputSourceSection,
  PromptInputSourceState,
  PromptInputStatus,
  PromptInputSubmitProps,
  PromptInputSubmitState,
  PromptInputTriggerDefinition,
  SkillRegistration,
  SourceRegistration,
};
