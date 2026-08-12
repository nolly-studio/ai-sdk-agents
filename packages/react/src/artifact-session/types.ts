/**
 * Public contracts for ArtifactSession.
 *
 * @remarks
 * Frozen v1 surface — see {@link ./INTERFACE.md}.
 */

import type { JSX, ReactNode } from "react";

import type {
  DataStreamPart,
  DataStreamPartErrorHandler,
} from "../data-stream-controller";

export type ArtifactStreamPhase = "idle" | "streaming";

export type ArtifactSessionState<K extends string = string> = {
  readonly documentId: string | null;
  readonly title: string;
  readonly kind: K;
  readonly content: string;
  readonly streamPhase: ArtifactStreamPhase;
};

export type ArtifactKindAdapter<
  TPart extends DataStreamPart,
  K extends string,
> = {
  readonly kind: K;
  initialContent: () => string;
  clear: (state: ArtifactSessionState<K>) => string;
  /**
   * Kind deltas only. Envelope parts are never passed here.
   * Return next content, or null if this part is not handled.
   */
  reducePart: (args: {
    part: TPart;
    state: ArtifactSessionState<K>;
  }) => string | null;
};

export type ArtifactSessionController<TPart extends DataStreamPart> = {
  applyPart: (part: TPart) => void;
  setContent: (content: string) => void;
  reset: () => void;
};

export type ArtifactSessionRootProps = {
  children?: ReactNode;
};

export type ArtifactSessionStreamProps<TPart extends DataStreamPart> = {
  onError?: DataStreamPartErrorHandler<TPart>;
};

export type ArtifactSessionNamespace<
  TPart extends DataStreamPart,
  K extends string,
> = {
  Root: (props: ArtifactSessionRootProps) => JSX.Element;
  Stream: (props: ArtifactSessionStreamProps<TPart>) => JSX.Element;
  useSnapshot: () => ArtifactSessionState<K>;
  useSelector: <T>(selector: (state: ArtifactSessionState<K>) => T) => T;
  useController: () => ArtifactSessionController<TPart>;
};
