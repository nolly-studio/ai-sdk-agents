import { act, StrictMode, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DataStreamControllerHandler,
  DataStreamControllerRoot,
} from "./components";
import type { DataStreamPart } from "./types";
import {
  useDataStreamAppend,
  useDataStreamController,
  useDataStreamStatus,
} from "./use-data-stream-controller";

const part = (
  type: `data-${string}`,
  data: unknown = null
): DataStreamPart => ({
  data,
  type,
});

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

describe("DataStreamController React wiring", () => {
  it("delivers parts appended through useAppend", () => {
    setup();
    const seen: string[] = [];

    function Ingress() {
      const append = useDataStreamAppend();
      useEffect(() => {
        append(part("data-id", "1"));
        append(part("data-title", "Hello"));
      }, [append]);
      return null;
    }

    render(
      <DataStreamControllerRoot>
        <DataStreamControllerHandler
          onPart={({ part: current }) => {
            seen.push(String(current.data));
          }}
        />
        <Ingress />
      </DataStreamControllerRoot>
    );

    expect(seen).toStrictEqual(["1", "Hello"]);
  });

  it("queues parts before Handler mounts and drains on mount", () => {
    setup();
    const seen: string[] = [];

    function App() {
      const [showHandler, setShowHandler] = useState(false);
      const append = useDataStreamAppend();

      useEffect(() => {
        append(part("data-id", "queued"));
      }, [append]);

      return (
        <>
          {showHandler ? (
            <DataStreamControllerHandler
              onPart={({ part: current }) => {
                seen.push(String(current.data));
              }}
            />
          ) : null}
          <button
            onClick={() => {
              setShowHandler(true);
            }}
            type="button"
          >
            show
          </button>
        </>
      );
    }

    render(
      <DataStreamControllerRoot>
        <App />
      </DataStreamControllerRoot>
    );
    expect(seen).toStrictEqual([]);

    click("button");
    expect(seen).toStrictEqual(["queued"]);
  });

  it("uses the latest onPart after callback replacement", () => {
    setup();
    const first = vi.fn();
    const second = vi.fn();

    function App() {
      const [handler, setHandler] = useState(() => first);
      const append = useDataStreamAppend();

      return (
        <>
          <DataStreamControllerHandler onPart={handler} />
          <button
            data-testid="append"
            onClick={() => {
              append(part("data-id", "x"));
            }}
            type="button"
          >
            append
          </button>
          <button
            data-testid="swap"
            onClick={() => {
              setHandler(() => second);
            }}
            type="button"
          >
            swap
          </button>
        </>
      );
    }

    render(
      <DataStreamControllerRoot>
        <App />
      </DataStreamControllerRoot>
    );

    click('[data-testid="append"]');
    expect(first).toHaveBeenCalledOnce();

    click('[data-testid="swap"]');
    click('[data-testid="append"]');
    expect(second).toHaveBeenCalledOnce();
    expect(first).toHaveBeenCalledOnce();
  });

  it("does not redeliver a claimed batch under Strict Mode", () => {
    setup();
    const onPart = vi.fn();

    function Ingress() {
      const append = useDataStreamAppend();
      useEffect(() => {
        append(part("data-id", "once"));
      }, [append]);
      return null;
    }

    render(
      <StrictMode>
        <DataStreamControllerRoot>
          <DataStreamControllerHandler onPart={onPart} />
          <Ingress />
        </DataStreamControllerRoot>
      </StrictMode>
    );

    expect(onPart).toHaveBeenCalledOnce();
  });

  it("does not rerender unrelated Root children on append bursts", () => {
    setup();
    let childRenders = 0;

    function Unrelated() {
      childRenders += 1;
      return <span>child</span>;
    }

    function Ingress() {
      const append = useDataStreamAppend();
      useEffect(() => {
        for (let index = 0; index < 20; index += 1) {
          append(part("data-textDelta", `t-${index}`));
        }
      }, [append]);
      return null;
    }

    render(
      <DataStreamControllerRoot>
        <DataStreamControllerHandler onPart={() => {}} />
        <Unrelated />
        <Ingress />
      </DataStreamControllerRoot>
    );

    const rendersAfterMount = childRenders;
    expect(rendersAfterMount).toBeGreaterThan(0);
    expect(childRenders).toBe(rendersAfterMount);
  });

  it("exposes pending status only to status subscribers", () => {
    setup();
    const statuses: number[] = [];

    function StatusProbe() {
      const status = useDataStreamStatus();
      statuses.push(status.pendingCount);
      return null;
    }

    function App() {
      const { append } = useDataStreamController();
      return (
        <button
          onClick={() => {
            append(part("data-id", "1"));
          }}
          type="button"
        >
          append
        </button>
      );
    }

    render(
      <DataStreamControllerRoot>
        <StatusProbe />
        {/* No Handler: part stays pending */}
        <App />
      </DataStreamControllerRoot>
    );

    expect(statuses.at(-1)).toBe(0);

    click("button");

    expect(statuses.at(-1)).toBe(1);
  });

  it("clear drops pending parts before Handler mounts", () => {
    setup();
    const onPart = vi.fn();

    function App() {
      const [showHandler, setShowHandler] = useState(false);
      const { append, clear } = useDataStreamController();

      useEffect(() => {
        append(part("data-id", "gone"));
        clear();
      }, [append, clear]);

      return (
        <>
          {showHandler ? <DataStreamControllerHandler onPart={onPart} /> : null}
          <button
            onClick={() => {
              setShowHandler(true);
            }}
            type="button"
          >
            show
          </button>
        </>
      );
    }

    render(
      <DataStreamControllerRoot>
        <App />
      </DataStreamControllerRoot>
    );

    click("button");

    expect(onPart).not.toHaveBeenCalled();
  });

  it("Handler remount drains parts appended while unmounted", () => {
    setup();
    const seen: string[] = [];

    function App() {
      const [showHandler, setShowHandler] = useState(true);
      const append = useDataStreamAppend();

      return (
        <>
          {showHandler ? (
            <DataStreamControllerHandler
              onPart={({ part: current }) => {
                seen.push(String(current.data));
              }}
            />
          ) : null}
          <button
            data-testid="hide"
            onClick={() => {
              setShowHandler(false);
            }}
            type="button"
          >
            hide
          </button>
          <button
            data-testid="append"
            onClick={() => {
              append(part("data-id", "while-hidden"));
            }}
            type="button"
          >
            append
          </button>
          <button
            data-testid="show"
            onClick={() => {
              setShowHandler(true);
            }}
            type="button"
          >
            show
          </button>
        </>
      );
    }

    render(
      <DataStreamControllerRoot>
        <App />
      </DataStreamControllerRoot>
    );

    click('[data-testid="hide"]');
    click('[data-testid="append"]');
    expect(seen).toStrictEqual([]);

    click('[data-testid="show"]');
    expect(seen).toStrictEqual(["while-hidden"]);
  });

  it("keeps controller command identities stable across status updates", () => {
    setup();
    const apis: unknown[] = [];

    function Probe() {
      const api = useDataStreamController();
      const append = useDataStreamAppend();
      // Subscribe so this component re-renders when the queue changes.
      useDataStreamStatus();
      apis.push(api, append);
      return (
        <button
          onClick={() => {
            api.append(part("data-id", "1"));
          }}
          type="button"
        >
          append
        </button>
      );
    }

    render(
      <DataStreamControllerRoot>
        <Probe />
      </DataStreamControllerRoot>
    );

    const firstApi = apis[0];
    const firstAppend = apis[1];

    click("button");

    expect(apis.length).toBeGreaterThan(2);
    expect(apis.at(-2)).toBe(firstApi);
    expect(apis.at(-1)).toBe(firstAppend);
  });
});
