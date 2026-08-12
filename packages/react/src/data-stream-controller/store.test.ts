import { describe, expect, it, vi } from "vitest";

import { createDataStreamStore } from "./store";
import type { DataStreamPart } from "./types";

const part = (
  type: `data-${string}`,
  data: unknown = null
): DataStreamPart => ({
  data,
  type,
});

describe(createDataStreamStore, () => {
  it("appends parts and updates status", () => {
    const store = createDataStreamStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.append(part("data-id", "doc-1"));

    expect(store.getStatus()).toStrictEqual({
      hasPendingParts: true,
      pendingCount: 1,
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("appendMany enqueues atomically and notifies once", () => {
    const store = createDataStreamStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.appendMany([
      part("data-id", "a"),
      part("data-title", "Hello"),
      part("data-finish", null),
    ]);

    expect(store.getStatus().pendingCount).toBe(3);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("empty appendMany is a no-op", () => {
    const store = createDataStreamStore();
    const empty = store.getStatus();
    const listener = vi.fn();
    store.subscribe(listener);

    store.appendMany([]);

    expect(store.getStatus()).toBe(empty);
    expect(listener).not.toHaveBeenCalled();
  });

  it("claims the queue in FIFO order and clears pending", () => {
    const store = createDataStreamStore();
    const a = part("data-id", "1");
    const b = part("data-title", "t");
    store.appendMany([a, b]);

    const batch = store.claim();

    expect(batch).toStrictEqual([a, b]);
    expect(store.getStatus()).toStrictEqual({
      hasPendingParts: false,
      pendingCount: 0,
    });
    expect(store.claim()).toStrictEqual([]);
  });

  it("keeps status snapshots referentially stable when unchanged", () => {
    const store = createDataStreamStore();
    const empty = store.getStatus();

    store.clear();
    expect(store.getStatus()).toBe(empty);

    store.append(part("data-id", "1"));
    const pending = store.getStatus();
    store.append(part("data-title", "x"));
    // count changed → new snapshot
    expect(store.getStatus()).not.toBe(pending);

    store.claim();
    expect(store.getStatus()).toBe(empty);
  });

  it("notifies only when status semantics change", () => {
    const store = createDataStreamStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.clear();
    store.appendMany([]);
    expect(listener).not.toHaveBeenCalled();

    store.append(part("data-id", "1"));
    expect(listener).toHaveBeenCalledOnce();

    store.claim();
    expect(listener).toHaveBeenCalledTimes(2);

    store.claim();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe stops notifications", () => {
    const store = createDataStreamStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.append(part("data-id", "1"));

    expect(listener).not.toHaveBeenCalled();
  });

  it("clear drops pending parts without delivery", () => {
    const store = createDataStreamStore();
    store.appendMany([part("data-id", "1"), part("data-title", "t")]);

    store.clear();

    expect(store.claim()).toStrictEqual([]);
    expect(store.getStatus().hasPendingParts).toBeFalsy();
  });

  it("append during a claimed batch goes to the next batch", () => {
    const store = createDataStreamStore();
    store.append(part("data-id", "1"));
    const batch = store.claim();

    store.append(part("data-title", "next"));

    expect(batch).toStrictEqual([part("data-id", "1")]);
    expect(store.claim()).toStrictEqual([part("data-title", "next")]);
  });

  it("clear during delivery affects only the next pending queue", () => {
    const store = createDataStreamStore();
    store.append(part("data-id", "1"));
    const batch = store.claim();
    store.append(part("data-title", "pending"));

    store.clear();

    expect(batch).toStrictEqual([part("data-id", "1")]);
    expect(store.claim()).toStrictEqual([]);
  });

  it("deactivate makes ingress commands no-ops and preserves the queue", () => {
    const store = createDataStreamStore();
    store.append(part("data-id", "kept"));
    const listener = vi.fn();
    store.subscribe(listener);

    store.deactivate();
    store.append(part("data-title", "ignored"));
    store.appendMany([part("data-finish", null)]);
    store.clear();

    expect(listener).not.toHaveBeenCalled();
    expect(store.getStatus().pendingCount).toBe(1);

    store.activate();
    expect(store.claim()).toStrictEqual([part("data-id", "kept")]);
  });

  it("keeps command function identities stable", () => {
    const store = createDataStreamStore();
    const { append, appendMany, clear, claim, subscribe, api } = store;

    expect(store.append).toBe(append);
    expect(store.appendMany).toBe(appendMany);
    expect(store.clear).toBe(clear);
    expect(store.claim).toBe(claim);
    expect(store.subscribe).toBe(subscribe);
    expect(store.api).toBe(api);
    expect(store.api.append).toBe(append);
  });
});
