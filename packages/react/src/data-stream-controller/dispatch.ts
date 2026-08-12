import type {
  DataStreamPart,
  DataStreamPartErrorHandler,
  DataStreamPartHandler,
} from "./types";

export interface DeliverBatchOptions<
  TPart extends DataStreamPart = DataStreamPart,
> {
  parts: readonly TPart[];
  onPart: DataStreamPartHandler<TPart>;
  onError?: DataStreamPartErrorHandler<TPart>;
}

/**
 * Synchronously attempts each claimed part in FIFO order.
 *
 * Thrown `onPart` errors are isolated per part. With no `onError`, the first
 * captured error is rethrown after the full batch. If `onError` throws, that
 * exception is retained as the unhandled batch error; later parts still run.
 */
export function deliverBatch<TPart extends DataStreamPart = DataStreamPart>(
  options: DeliverBatchOptions<TPart>
): void {
  const { parts, onPart, onError } = options;
  let firstUnhandled: unknown;

  for (const part of parts) {
    try {
      onPart({ part });
    } catch (error) {
      if (onError) {
        try {
          onError({ cause: error, part });
        } catch (handlerError) {
          firstUnhandled ??= handlerError;
        }
      } else {
        firstUnhandled ??= error;
      }
    }
  }

  if (firstUnhandled !== undefined) {
    throw firstUnhandled;
  }
}
