/**
 * Public contracts for DataStreamController.
 *
 * @remarks
 * Frozen v1 surface — see {@link ./INTERFACE.md}.
 * Structural `data-*` shapes stay AI SDK-compatible without a runtime `ai` dependency.
 */

/**
 * Minimal structural stream part. Aligns with AI SDK `DataUIPart` vocabulary.
 * `data` is required (including `null` payloads). `type` must be `data-*`.
 */
export interface DataStreamPart {
  readonly type: `data-${string}`;
  readonly data: unknown;
  readonly id?: string;
}

/**
 * Selective status snapshot for `useDataStreamStatus`.
 * Snapshots should stay referentially stable while semantics are unchanged.
 */
export interface DataStreamStatus {
  readonly pendingCount: number;
  readonly hasPendingParts: boolean;
}

/**
 * Imperative ingress API exposed by hooks. Drain/subscribe stay private.
 */
export interface DataStreamControllerApi<
  TPart extends DataStreamPart = DataStreamPart,
> {
  append: (part: TPart) => void;
  appendMany: (parts: readonly TPart[]) => void;
  clear: () => void;
}

export type DataStreamPartHandler<
  TPart extends DataStreamPart = DataStreamPart,
> = (event: { readonly part: TPart }) => void;

export type DataStreamPartErrorHandler<
  TPart extends DataStreamPart = DataStreamPart,
> = (event: { readonly cause: unknown; readonly part: TPart }) => void;
