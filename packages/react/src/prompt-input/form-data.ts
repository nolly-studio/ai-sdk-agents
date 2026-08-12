import type { PromptInputMessage } from "./types";

/**
 * Build a FormData payload from a PromptInput message for native / multipart
 * posts. Attachment Files are appended as `attachments` (or `files`).
 */
function messageToFormData(
  message: PromptInputMessage,
  options?: {
    attachmentField?: string;
    messageField?: string;
  }
): FormData {
  const formData = new FormData();
  const messageField = options?.messageField ?? "message";
  const attachmentField = options?.attachmentField ?? "attachments";

  formData.set(messageField, message.text);
  if (message.modelId) {
    formData.set("modelId", message.modelId);
  }
  for (const id of message.skillIds) {
    formData.append("skillIds", id);
  }
  for (const id of message.sourceIds) {
    formData.append("sourceIds", id);
  }
  for (const source of message.referencedSources) {
    formData.append(
      "referencedSources",
      JSON.stringify({
        filename: source.filename,
        id: source.id,
        mediaType: source.mediaType,
        title: source.title,
        url: source.url,
      })
    );
  }
  for (const attachment of message.attachments) {
    if (attachment.file) {
      formData.append(attachmentField, attachment.file, attachment.name);
    }
  }

  return formData;
}

export { messageToFormData };
