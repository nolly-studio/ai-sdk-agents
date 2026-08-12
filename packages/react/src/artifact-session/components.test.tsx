import { act, StrictMode, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataStreamController } from "../data-stream-controller";
import { createArtifactSession } from "./create-artifact-session";
import type { ArtifactKindAdapter } from "./types";

type TextPart =
  | { type: "data-id"; data: string }
  | { type: "data-title"; data: string }
  | { type: "data-kind"; data: string }
  | { type: "data-clear"; data: null }
  | { type: "data-finish"; data: null }
  | { type: "data-textDelta"; data: string };

const textAdapter: ArtifactKindAdapter<TextPart, "text"> = {
  kind: "text",
  initialContent: () => "",
  clear: () => "",
  reducePart: ({ part, state }) => {
    if (part.type !== "data-textDelta") {
      return null;
    }
    return `${state.content}${part.data}`;
  },
};

const TextArtifactSession = createArtifactSession({ adapter: textAdapter });

const part = <T extends TextPart["type"]>(
  type: T,
  data: Extract<TextPart, { type: T }>["data"]
): Extract<TextPart, { type: T }> =>
  ({ type, data }) as Extract<TextPart, { type: T }>;

let container: HTMLDivElement;
let root: Root;

function render(ui: ReactNode) {
  act(() => {
    root.render(ui);
  });
}

function click(selector: string) {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing element: ${selector}`);
  }
  act(() => {
    element.click();
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

describe("createArtifactSession React wiring", () => {
  it("delivers DSC appends through Stream into the session", () => {
    setup();

    function TitleProbe() {
      const title = TextArtifactSession.useSelector((state) => state.title);
      return <span data-testid="title">{title}</span>;
    }

    function Ingress() {
      const append = DataStreamController.useAppend<TextPart>();
      useEffect(() => {
        append(part("data-id", "doc-1"));
        append(part("data-title", "Launch"));
        append(part("data-kind", "text"));
        append(part("data-textDelta", "Hello"));
        append(part("data-finish", null));
      }, [append]);
      return null;
    }

    render(
      <DataStreamController.Root>
        <TextArtifactSession.Root>
          <TextArtifactSession.Stream />
          <TitleProbe />
          <Ingress />
        </TextArtifactSession.Root>
      </DataStreamController.Root>
    );

    expect(container.querySelector("[data-testid='title']")?.textContent).toBe(
      "Launch"
    );
  });

  it("does not rerender a title selector when only content changes", () => {
    setup();
    let titleRenders = 0;

    function TitleProbe() {
      TextArtifactSession.useSelector((state) => state.title);
      titleRenders += 1;
      return null;
    }

    function Ingress() {
      const append = DataStreamController.useAppend<TextPart>();
      useEffect(() => {
        append(part("data-id", "doc-1"));
        append(part("data-title", "Stable"));
        for (let index = 0; index < 20; index += 1) {
          append(part("data-textDelta", `${index}`));
        }
      }, [append]);
      return null;
    }

    render(
      <DataStreamController.Root>
        <TextArtifactSession.Root>
          <TextArtifactSession.Stream />
          <TitleProbe />
          <Ingress />
        </TextArtifactSession.Root>
      </DataStreamController.Root>
    );

    // Mount + title transition; content deltas must not add title renders.
    expect(titleRenders).toBeLessThanOrEqual(3);
  });

  it("preserves session state across Strict Mode replay", () => {
    setup();

    function SnapshotProbe() {
      const snapshot = TextArtifactSession.useSnapshot();
      return (
        <span data-testid="content">
          {snapshot.documentId}:{snapshot.content}:{snapshot.streamPhase}
        </span>
      );
    }

    function Ingress() {
      const append = DataStreamController.useAppend<TextPart>();
      useEffect(() => {
        append(part("data-id", "once"));
        append(part("data-textDelta", "body"));
        append(part("data-finish", null));
      }, [append]);
      return null;
    }

    render(
      <StrictMode>
        <DataStreamController.Root>
          <TextArtifactSession.Root>
            <TextArtifactSession.Stream />
            <SnapshotProbe />
            <Ingress />
          </TextArtifactSession.Root>
        </DataStreamController.Root>
      </StrictMode>
    );

    expect(
      container.querySelector("[data-testid='content']")?.textContent
    ).toBe("once:body:idle");
  });

  it("makes captured commands inert after Root unmount", () => {
    setup();
    let captured: ReturnType<typeof TextArtifactSession.useController> | null =
      null;
    let contentWhileMounted = "";

    function Capture() {
      captured = TextArtifactSession.useController();
      contentWhileMounted = TextArtifactSession.useSelector(
        (state) => state.content
      );
      return <span data-testid="content">{contentWhileMounted}</span>;
    }

    function App({ children }: { children?: ReactNode }) {
      const [mounted, setMounted] = useState(true);
      return (
        <>
          <button
            data-testid="unmount"
            onClick={() => {
              setMounted(false);
            }}
            type="button"
          >
            unmount
          </button>
          {mounted ? children : null}
        </>
      );
    }

    render(
      <App>
        <TextArtifactSession.Root>
          <Capture />
        </TextArtifactSession.Root>
      </App>
    );

    act(() => {
      captured?.setContent("before");
    });
    expect(
      container.querySelector("[data-testid='content']")?.textContent
    ).toBe("before");

    click("[data-testid='unmount']");

    act(() => {
      captured?.setContent("after-unmount");
      captured?.applyPart(part("data-id", "x"));
      captured?.reset();
    });
    // Commands are inert; no throw after deactivate.
  });

  it("forwards Stream onError when applyPart throws", () => {
    setup();
    const onError = vi.fn();

    const ExplodingSession = createArtifactSession({
      adapter: {
        ...textAdapter,
        reducePart: () => {
          throw new Error("adapter failed");
        },
      },
    });

    function Ingress() {
      const append = DataStreamController.useAppend<TextPart>();
      useEffect(() => {
        append(part("data-textDelta", "x"));
      }, [append]);
      return null;
    }

    render(
      <DataStreamController.Root>
        <ExplodingSession.Root>
          <ExplodingSession.Stream onError={onError} />
          <Ingress />
        </ExplodingSession.Root>
      </DataStreamController.Root>
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0].cause).toMatchObject({
      message: "adapter failed",
    });
  });

  it("throws outside Root", () => {
    setup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Bad() {
      TextArtifactSession.useSnapshot();
      return null;
    }

    expect(() => {
      render(<Bad />);
    }).toThrow(/within the Root/u);

    spy.mockRestore();
  });
});
