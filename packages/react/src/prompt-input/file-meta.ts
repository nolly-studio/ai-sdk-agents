const TEXT_LIKE_EXTENSIONS = new Set([
  "md",
  "txt",
  "markdown",
  "json",
  "csv",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "vue",
  "svelte",
  "log",
  "env",
  "yml",
  "yaml",
  "toml",
  "ini",
  "cfg",
  "gitignore",
  "editorconfig",
]);

function fileExtensionLabel(file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot === -1 ? "" : file.name.slice(dot + 1);
  if (ext) {
    return ext.slice(0, 8).toLowerCase();
  }
  const [, subtype] = file.type.split("/");
  if (subtype) {
    return subtype.replaceAll("+", " ").slice(0, 8).toLowerCase();
  }
  return "file";
}

function isLikelyTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) {
    return true;
  }
  if (
    file.type === "application/json" ||
    file.type === "application/xml" ||
    file.type.endsWith("+json") ||
    file.type.endsWith("+xml")
  ) {
    return true;
  }
  const ext = fileExtensionLabel(file);
  return TEXT_LIKE_EXTENSIONS.has(ext);
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export {
  fileExtensionLabel,
  formatFileSize,
  isLikelyTextFile,
  TEXT_LIKE_EXTENSIONS,
};
