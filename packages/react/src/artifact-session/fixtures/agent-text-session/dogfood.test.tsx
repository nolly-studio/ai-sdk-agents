import { act, useEffect } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { DataStreamController } from "../../../data-stream-controller";
import { createArtifactSession } from "../../create-artifact-session";
import { textAdapter } from "./text-adapter";
import type { AgentTextDataPart } from "./types";

const TextArtifactSession = createArtifactSession({ adapter: textAdapter });

const part = <T extends AgentTextDataPart["type"]>(
  type: T,
  data: Extract<AgentTextDataPart, { type: T }>["data"]
): Extract<AgentTextDataPart, { type: T }> =>
  ({ type, data }) as Extract<AgentTextDataPart, { type: T }>;

let container: HTMLDivElement;
let root: Root;

function render(ui: ReactNode) {
  act(() => {
    root.render(ui);
  });
}

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function setup() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
}

describe("agent-text-session dogfood", () => {
  it("replays id → title → kind → clear → deltas → finish", () => {
    setup();

    function Probe() {
      const snapshot = TextArtifactSession.useSnapshot();
      return (
        <pre data-testid="snap">
          {JSON.stringify({
            content: snapshot.content,
            documentId: snapshot.documentId,
            kind: snapshot.kind,
            streamPhase: snapshot.streamPhase,
            title: snapshot.title,
          })}
        </pre>
      );
    }

    function Ingress() {
      const append = DataStreamController.useAppend<AgentTextDataPart>();
      useEffect(() => {
        append(part("data-id", "doc-42"));
        append(part("data-title", "Launch notes"));
        append(part("data-kind", "text"));
        append(part("data-clear", null));
        append(part("data-textDelta", "Hello "));
        append(part("data-textDelta", "world"));
        append(part("data-finish", null));
      }, [append]);
      return null;
    }

    render(
      <DataStreamController.Root>
        <TextArtifactSession.Root>
          <TextArtifactSession.Stream />
          <Probe />
          <Ingress />
        </TextArtifactSession.Root>
      </DataStreamController.Root>
    );

    expect(
      JSON.parse(
        container.querySelector("[data-testid='snap']")?.textContent ?? "{}"
      )
    ).toStrictEqual({
      content: "Hello world",
      documentId: "doc-42",
      kind: "text",
      streamPhase: "idle",
      title: "Launch notes",
    });
  });
});
