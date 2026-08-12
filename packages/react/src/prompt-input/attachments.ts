import type {
  PromptInputAttachment,
  PromptInputAttachmentError,
  PromptInputAttachmentKind,
} from "./types";
import { matchesAccept } from "./utils";

function createAttachmentId(next: { current: number }): string {
  const id = String(next.current);
  next.current += 1;
  return id;
}

function revokeAttachmentPreview(attachment: PromptInputAttachment) {
  if (attachment.preview) {
    URL.revokeObjectURL(attachment.preview);
  }
}

function revokeAllAttachmentPreviews(
  attachments: readonly PromptInputAttachment[]
) {
  for (const attachment of attachments) {
    revokeAttachmentPreview(attachment);
  }
}

function attachmentFromFile(
  file: File,
  id: string,
  fallbackKind: PromptInputAttachmentKind = "file"
): PromptInputAttachment {
  const isImage = file.type.startsWith("image/");

  return {
    file,
    id,
    kind: isImage ? "image" : fallbackKind,
    name: file.name,
    preview: isImage ? URL.createObjectURL(file) : null,
  };
}

function filterIncomingFiles(options: {
  accept?: string;
  currentCount: number;
  files: FileList | File[];
  maxFileSize?: number;
  maxFiles?: number;
  onError?: (error: PromptInputAttachmentError) => void;
}): File[] {
  const incoming = [...options.files];
  if (!incoming.length) {
    return [];
  }

  const accepted = incoming.filter((file) =>
    matchesAccept(file, options.accept)
  );

  if (incoming.length && accepted.length === 0) {
    options.onError?.({
      code: "accept",
      message: "No files match the accepted types.",
    });
    return [];
  }

  const sized = accepted.filter((file) =>
    options.maxFileSize ? file.size <= options.maxFileSize : true
  );

  if (accepted.length > 0 && sized.length === 0) {
    options.onError?.({
      code: "max_file_size",
      message: "All files exceed the maximum size.",
    });
    return [];
  }

  if (typeof options.maxFiles !== "number") {
    return sized;
  }

  const capacity = Math.max(0, options.maxFiles - options.currentCount);
  if (sized.length > capacity) {
    options.onError?.({
      code: "max_files",
      message: "Too many files. Some were not added.",
    });
  }

  return sized.slice(0, capacity);
}

export {
  attachmentFromFile,
  createAttachmentId,
  filterIncomingFiles,
  revokeAllAttachmentPreviews,
  revokeAttachmentPreview,
};
