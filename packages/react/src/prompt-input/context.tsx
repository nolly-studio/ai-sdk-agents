import * as React from "react";

import type {
  PromptInputAttachment,
  PromptInputContextValue,
  PromptInputProviderContextValue,
} from "./types";

const PromptInputContext = React.createContext<PromptInputContextValue | null>(
  null
);

const PromptInputProviderContext =
  React.createContext<PromptInputProviderContextValue | null>(null);

function usePromptInputContext(component: string) {
  const context = React.useContext(PromptInputContext);

  if (!context) {
    throw new Error(
      `${component} must be used within a PromptInput.Root component.`
    );
  }

  return context;
}

function useOptionalPromptInputProvider() {
  return React.useContext(PromptInputProviderContext);
}

type PromptInputProviderProps = {
  children?: React.ReactNode;
  defaultAttachments?: PromptInputAttachment[];
  defaultModelId?: string | null;
  defaultValue?: string;
};

const EMPTY_ATTACHMENTS: PromptInputAttachment[] = [];

function PromptInputProvider({
  children,
  defaultAttachments = EMPTY_ATTACHMENTS,
  defaultModelId = null,
  defaultValue = "",
}: PromptInputProviderProps) {
  const [value, setValue] = React.useState(defaultValue);
  const [attachments, setAttachments] =
    React.useState<PromptInputAttachment[]>(defaultAttachments);
  const [modelId, setModelId] = React.useState<string | null>(defaultModelId);

  const context = React.useMemo<PromptInputProviderContextValue>(
    () => ({
      attachments,
      modelId,
      setAttachments,
      setModelId,
      setValue,
      value,
    }),
    [attachments, modelId, value]
  );

  return (
    <PromptInputProviderContext.Provider value={context}>
      {children}
    </PromptInputProviderContext.Provider>
  );
}

export {
  PromptInputContext,
  PromptInputProvider,
  PromptInputProviderContext,
  useOptionalPromptInputProvider,
  usePromptInputContext,
};
