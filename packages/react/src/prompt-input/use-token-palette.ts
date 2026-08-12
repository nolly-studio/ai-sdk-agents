import * as React from "react";

import type { EditorTokenRange } from "./editor";
import { getCollapsedCaretInEditor } from "./editor";
import { filterByNameOrDesc } from "./filter";

type TokenPaletteItem = {
  desc?: string;
  disabled?: boolean;
  id: string;
  name: string;
};

type UseTokenPaletteOptions<T extends TokenPaletteItem> = {
  boundaryPattern: RegExp;
  getEditor: () => HTMLElement | null;
  ignoreHoverRef: { current: boolean };
  items: readonly T[];
  onOpen?: () => void;
  suppressWhen?: RegExp;
};

type UseTokenPaletteResult<T extends TokenPaletteItem> = {
  close: () => void;
  detect: () => void;
  index: number;
  indexRef: React.MutableRefObject<number>;
  keyboard: boolean;
  move: (delta: number) => void;
  open: boolean;
  openRef: React.MutableRefObject<boolean>;
  query: string;
  results: T[];
  resultsRef: React.MutableRefObject<T[]>;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setKeyboard: React.Dispatch<React.SetStateAction<boolean>>;
  tokenRef: React.MutableRefObject<EditorTokenRange | null>;
};

function useTokenPalette<T extends TokenPaletteItem>({
  boundaryPattern,
  getEditor,
  ignoreHoverRef,
  items,
  onOpen,
  suppressWhen,
}: UseTokenPaletteOptions<T>): UseTokenPaletteResult<T> {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const [keyboard, setKeyboard] = React.useState(false);

  const openRef = React.useRef(false);
  const indexRef = React.useRef(0);
  const resultsRef = React.useRef<T[]>([]);
  const queryRef = React.useRef("");
  const tokenRef = React.useRef<EditorTokenRange | null>(null);

  const results = filterByNameOrDesc(items, query);

  openRef.current = open;
  indexRef.current = index;
  resultsRef.current = results;

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setIndex(0);
    setKeyboard(false);
    queryRef.current = "";
    tokenRef.current = null;
    ignoreHoverRef.current = false;
  }, [ignoreHoverRef]);

  const detect = React.useCallback(() => {
    const editor = getEditor();
    if (!editor) {
      close();
      return;
    }

    const caret = getCollapsedCaretInEditor(editor);
    if (!caret) {
      close();
      return;
    }

    if (suppressWhen?.test(caret.before)) {
      close();
      return;
    }

    const match = caret.before.match(boundaryPattern);
    if (!match) {
      close();
      return;
    }

    onOpen?.();
    const nextQuery = match[1] ?? "";
    const tokenStart = caret.before.length - nextQuery.length - 1;
    tokenRef.current = {
      end: caret.offset,
      node: caret.node,
      start: tokenStart,
    };

    if (nextQuery !== queryRef.current) {
      queryRef.current = nextQuery;
      setIndex(0);
    }

    setQuery(nextQuery);
    setOpen(true);
  }, [boundaryPattern, close, getEditor, onOpen, suppressWhen]);

  const move = React.useCallback(
    (delta: number) => {
      const list = resultsRef.current;
      if (!list.length) {
        return;
      }
      ignoreHoverRef.current = true;
      setKeyboard(true);
      setIndex((current) => (current + delta + list.length * 10) % list.length);
    },
    [ignoreHoverRef]
  );

  React.useEffect(() => {
    if (!(open && results.length)) {
      return;
    }
    if (index >= results.length) {
      setIndex(0);
    }
  }, [index, open, results.length]);

  return {
    close,
    detect,
    index,
    indexRef,
    keyboard,
    move,
    open,
    openRef,
    query,
    results,
    resultsRef,
    setIndex,
    setKeyboard,
    tokenRef,
  };
}

export type { TokenPaletteItem, UseTokenPaletteOptions, UseTokenPaletteResult };
export { useTokenPalette };
