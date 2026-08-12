/**
 * Internal dogfood: exercise the *public* DataStreamController API with a
 * Pattern-shaped `DataUIPart` union and temporary artifact sink adapter.
 */
import { act, useEffect } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataStreamController, DataStreamControllerHandler } from "../../index";
import type { DataStreamPartHandler } from "../../index";
import { createAgentTextSink } from "./apply-agent-text-part";
import type { AgentTextDataPart } from "./types";

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

function part<TType extends AgentTextDataPart["type"]>(
  type: TType,
  data: Extract<AgentTextDataPart, { type: TType }>["data"]
): AgentTextDataPart {
  return { data, type } as AgentTextDataPart;
}

describe("DataStreamController dogfood (agent-text shaped)", () => {
  it("applies ordered id/title/textDelta/clear/finish through the public API", () => {
    setup();
    const sink = createAgentTextSink();
    const snapshots: string[] = [];

    const handlePart: DataStreamPartHandler<AgentTextDataPart> = (event) => {
      sink.onPart(event);
      snapshots.push(
        `${sink.getArtifact().status}:${sink.getArtifact().content}`
      );
    };

    function Ingress() {
      const append = DataStreamController.useAppend<AgentTextDataPart>();

      useEffect(() => {
        // useChat({ onData: append }) compatible boundary
        append(part("data-id", "doc-42"));
        append(part("data-title", "Launch notes"));
        append(part("data-kind", "text"));
        append(part("data-textDelta", "Hello "));
        append(part("data-textDelta", "world"));
        append(part("data-finish", null));
      }, [append]);

      return null;
    }

    render(
      <DataStreamController.Root>
        <DataStreamControllerHandler<AgentTextDataPart> onPart={handlePart} />
        <Ingress />
      </DataStreamController.Root>
    );

    expect(sink.getArtifact()).toStrictEqual({
      content: "Hello world",
      documentId: "doc-42",
      kind: "text",
      status: "idle",
      title: "Launch notes",
    });
    expect(snapshots.at(-1)).toBe("idle:Hello world");
  });

  it("honors data-clear as empty content like text artifact Patterns", () => {
    setup();
    const sink = createAgentTextSink();

    function Ingress() {
      const append = DataStreamController.useAppend<AgentTextDataPart>();
      useEffect(() => {
        append(part("data-textDelta", "draft"));
        append(part("data-clear", null));
        append(part("data-textDelta", "final"));
        append(part("data-finish", null));
      }, [append]);
      return null;
    }

    render(
      <DataStreamController.Root>
        <DataStreamControllerHandler<AgentTextDataPart> onPart={sink.onPart} />
        <Ingress />
      </DataStreamController.Root>
    );

    expect(sink.getArtifact().content).toBe("final");
    expect(sink.getArtifact().status).toBe("idle");
  });

  it("continues delivery after a sink failure when onError handles it", () => {
    setup();
    const sink = createAgentTextSink();
    const onError = vi.fn();

    const handlePart: DataStreamPartHandler<AgentTextDataPart> = (event) => {
      if (event.part.type === "data-title") {
        throw new Error("sink failed");
      }
      sink.onPart(event);
    };

    function Ingress() {
      const append = DataStreamController.useAppend<AgentTextDataPart>();
      useEffect(() => {
        append(part("data-id", "ok"));
        append(part("data-title", "boom"));
        append(part("data-textDelta", "survived"));
        append(part("data-finish", null));
      }, [append]);
      return null;
    }

    render(
      <DataStreamController.Root>
        <DataStreamControllerHandler<AgentTextDataPart>
          onError={onError}
          onPart={handlePart}
        />
        <Ingress />
      </DataStreamController.Root>
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(sink.getArtifact()).toMatchObject({
      content: "survived",
      documentId: "ok",
      status: "idle",
    });
    // Failed title update did not apply
    expect(sink.getArtifact().title).toBe("");
  });

  it("accepts DataUIPart discrimination for title payloads", () => {
    const handlePart: DataStreamPartHandler<AgentTextDataPart> = ({
      part: current,
    }) => {
      if (current.type === "data-title") {
        // compile-time: data is string
        const title: string = current.data;
        expect(title.length).toBeGreaterThan(0);
      }
    };

    handlePart({ part: part("data-title", "Typed") });
  });
});
