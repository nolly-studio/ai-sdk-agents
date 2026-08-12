"use client";

import {
  DataStreamControllerHandler,
  DataStreamControllerRoot,
} from "./components";
import {
  useDataStreamAppend,
  useDataStreamController,
  useDataStreamStatus,
} from "./use-data-stream-controller";

export const DataStreamController = {
  Handler: DataStreamControllerHandler,
  Root: DataStreamControllerRoot,
  useAppend: useDataStreamAppend,
  useController: useDataStreamController,
  useStatus: useDataStreamStatus,
} as const;

export type DataStreamControllerNamespace = typeof DataStreamController;

export {
  DataStreamControllerHandler,
  type DataStreamControllerHandlerProps,
  DataStreamControllerRoot,
  type DataStreamControllerRootProps,
} from "./components";

export type {
  DataStreamControllerApi,
  DataStreamPart,
  DataStreamPartErrorHandler,
  DataStreamPartHandler,
  DataStreamStatus,
} from "./types";

export {
  useDataStreamAppend,
  useDataStreamController,
  useDataStreamStatus,
} from "./use-data-stream-controller";
