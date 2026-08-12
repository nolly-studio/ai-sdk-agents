import { act, useEffect } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { DataStreamController } from "../../../data-stream-controller";
import { createArtifactSession } from "../../create-artifact-session";
import { EMPTY_WHITEBOARD_JSON } from "./types";
import type { AgentWhiteboardDataPart } from "./types";
import { whiteboardAdapter } from "./whiteboard-adapter";

const WhiteboardSession = createArtifactSession({
  adapter: whiteboardAdapter,
});

const part = <T extends AgentWhiteboardDataPart["type"]>(
  type: T,
  data: Extract<AgentWhiteboardDataPart, { type: T }>["data"]
): Extract<AgentWhiteboardDataPart, { type: T }> =>
  ({ type, data }) as Extract<AgentWhiteboardDataPart, { type: T }>;

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

describe("agent-whiteboard-session dogfood", () => {
  it("clears to empty scene JSON and stays streaming until finish", () => {
    setup();

    function Probe() {
      const snapshot = WhiteboardSession.useSnapshot();
      return (
        <pre data-testid="snap">
          {JSON.stringify({
            content: snapshot.content,
            documentId: snapshot.documentId,
            streamPhase: snapshot.streamPhase,
          })}
        </pre>
      );
    }

    function Ingress() {
      const append = DataStreamController.useAppend<AgentWhiteboardDataPart>();
      useEffect(() => {
        append(part("data-id", "board-1"));
        append(part("data-title", "Sketch"));
        append(part("data-kind", "whiteboard"));
        append(part("data-clear", null));
        append(
          part(
            "data-whiteboardDelta",
            '{"elements":[{"id":"a"}],"appState":{}}'
          )
        );
        // UI may treat scene as ready here; streamPhase remains streaming until finish.
        append(part("data-finish", null));
      }, [append]);
      return null;
    }

    render(
      <DataStreamController.Root>
        <WhiteboardSession.Root>
          <WhiteboardSession.Stream />
          <Probe />
          <Ingress />
        </WhiteboardSession.Root>
      </DataStreamController.Root>
    );

    const snap = JSON.parse(
      container.querySelector("[data-testid='snap']")?.textContent ?? "{}"
    );
    expect(snap.documentId).toBe("board-1");
    expect(snap.content).toBe('{"elements":[{"id":"a"}],"appState":{}}');
    expect(snap.streamPhase).toBe("idle");
  });

  it("uses EMPTY_WHITEBOARD_JSON on clear and initialContent on new id", () => {
    setup();

    function Probe() {
      const controller = WhiteboardSession.useController();
      const snapshot = WhiteboardSession.useSnapshot();
      return (
        <>
          <button
            data-testid="run"
            onClick={() => {
              controller.applyPart(part("data-id", "a"));
              controller.applyPart(
                part("data-whiteboardDelta", '{"elements":[1],"appState":{}}')
              );
              controller.applyPart(part("data-clear", null));
              controller.applyPart(part("data-id", "b"));
            }}
            type="button"
          >
            run
          </button>
          <pre data-testid="snap">
            {JSON.stringify({
              content: snapshot.content,
              documentId: snapshot.documentId,
            })}
          </pre>
        </>
      );
    }

    render(
      <WhiteboardSession.Root>
        <Probe />
      </WhiteboardSession.Root>
    );

    expect(
      JSON.parse(
        container.querySelector("[data-testid='snap']")?.textContent ?? "{}"
      ).content
    ).toBe(EMPTY_WHITEBOARD_JSON);

    const button = container.querySelector("[data-testid='run']");
    if (!(button instanceof HTMLElement)) {
      throw new Error("missing run button");
    }
    act(() => {
      button.click();
    });

    const snap = JSON.parse(
      container.querySelector("[data-testid='snap']")?.textContent ?? "{}"
    );
    expect(snap.documentId).toBe("b");
    expect(snap.content).toBe(EMPTY_WHITEBOARD_JSON);
  });
});
