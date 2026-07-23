export const ALLOWED_FILE_EXTENSIONS = ".pdf,.docx,.doc,.txt,.md,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp";

export const ALLOWED_EXTENSIONS_ARRAY = [
  ".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".xls", ".csv", ".png", ".jpg", ".jpeg", ".webp"
];

export function isFileExtensionAllowed(filename) {
  if (!filename) return false;
  const parts = filename.split('.');
  if (parts.length < 2) return false;
  const ext = "." + parts.pop().toLowerCase();
  return ALLOWED_EXTENSIONS_ARRAY.includes(ext);
}
