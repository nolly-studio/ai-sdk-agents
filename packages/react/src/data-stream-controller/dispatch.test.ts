import { describe, expect, it, vi } from "vitest";

import { deliverBatch } from "./dispatch";
import { createDataStreamStore } from "./store";
import type { DataStreamPart } from "./types";

const part = (
  type: `data-${string}`,
  data: unknown = null
): DataStreamPart => ({
  data,
  type,
});

describe(deliverBatch, () => {
  it("attempts parts in FIFO order", () => {
    const seen: string[] = [];
    const parts = [
      part("data-id", "1"),
      part("data-title", "Hello"),
      part("data-finish", null),
    ];

    deliverBatch({
      onPart: ({ part: current }) => {
        seen.push(current.type);
      },
      parts,
    });

    expect(seen).toStrictEqual(["data-id", "data-title", "data-finish"]);
  });

  it("continues after a thrown onPart and rethrows the first error", () => {
    const seen: string[] = [];
    const firstError = new Error("boom");

    expect(() =>
      deliverBatch({
        onPart: ({ part: current }) => {
          seen.push(current.type);
          if (current.type === "data-title") {
            throw firstError;
          }
        },
        parts: [
          part("data-id", "1"),
          part("data-title", "fail"),
          part("data-finish", null),
        ],
      })
    ).toThrow(firstError);

    expect(seen).toStrictEqual(["data-id", "data-title", "data-finish"]);
  });

  it("keeps the first unhandled error when multiple parts throw", () => {
    const first = new Error("first");
    const second = new Error("second");

    expect(() =>
      deliverBatch({
        onPart: ({ part: current }) => {
          throw current.type === "data-id" ? first : second;
        },
        parts: [part("data-id", "1"), part("data-title", "2")],
      })
    ).toThrow(first);
  });

  it("does not rethrow when onError handles the failure", () => {
    const onError = vi.fn();

    expect(() =>
      deliverBatch({
        onError,
        onPart: ({ part: current }) => {
          if (current.type === "data-id") {
            throw new Error("handled");
          }
        },
        parts: [part("data-id", "1"), part("data-title", "ok")],
      })
    ).not.toThrow();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0].part.type).toBe("data-id");
  });

  it("rethrows the first onError throw after finishing the batch", () => {
    const seen: string[] = [];
    const handlerError = new Error("onError failed");

    expect(() =>
      deliverBatch({
        onError: ({ part: current }) => {
          if (current.type === "data-id") {
            throw handlerError;
          }
        },
        onPart: ({ part: current }) => {
          seen.push(current.type);
          if (current.type !== "data-finish") {
            throw new Error(`fail-${current.type}`);
          }
        },
        parts: [
          part("data-id", "1"),
          part("data-title", "2"),
          part("data-finish", null),
        ],
      })
    ).toThrow(handlerError);

    expect(seen).toStrictEqual(["data-id", "data-title", "data-finish"]);
  });

  it("does not automatically retry a failed part", () => {
    const onPart = vi.fn(({ part: current }: { part: DataStreamPart }) => {
      if (current.type === "data-id") {
        throw new Error("once");
      }
    });

    expect(() =>
      deliverBatch({
        onPart,
        parts: [part("data-id", "1")],
      })
    ).toThrow("once");

    expect(onPart).toHaveBeenCalledOnce();
  });

  it("supports explicit re-append from onError into the next batch", () => {
    const store = createDataStreamStore();
    const failed = part("data-title", "retry-me");
    store.appendMany([part("data-id", "1"), failed]);

    const batch = store.claim();

    deliverBatch({
      onError: ({ part: current }) => {
        store.append(current);
      },
      onPart: ({ part: current }) => {
        if (current.type === "data-title") {
          throw new Error("retry");
        }
      },
      parts: batch,
    });

    expect(store.claim()).toStrictEqual([failed]);
  });
});
