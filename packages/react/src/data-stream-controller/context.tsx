"use client";

import { createContext, useContext } from "react";

import type { DataStreamStore } from "./store";
import type { DataStreamPart } from "./types";

export const DataStreamControllerContext =
  createContext<DataStreamStore<DataStreamPart> | null>(null);

export function useDataStreamStore<
  TPart extends DataStreamPart = DataStreamPart,
>(): DataStreamStore<TPart> {
  const store = useContext(DataStreamControllerContext);
  if (!store) {
    throw new Error(
      "DataStreamController components must be used within DataStreamController.Root"
    );
  }
  // Context stores the base part store; consumers narrow via TPart at the hook.
  return store as unknown as DataStreamStore<TPart>;
}
