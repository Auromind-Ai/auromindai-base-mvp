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

export const MEDIA_LIMITS = {
  DOCUMENT_MAX_BYTES: 50 * 1024 * 1024,
  IMAGE_MAX_BYTES: 20 * 1024 * 1024,
  VIDEO_MAX_BYTES: 50 * 1024 * 1024,
};

export function validateMediaUpload(file) {
  if (!file) return { valid: false, error: "No file selected." };

  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    if (file.size > MEDIA_LIMITS.IMAGE_MAX_BYTES) {
      return {
        valid: false,
        error: `Image size (${sizeMB} MB) exceeds the 20 MB limit. Please select an image under 20 MB (it will be auto-optimized for WhatsApp).`
      };
    }
  } else if (file.type.startsWith("video/") || /\.(mp4|mov|webm|ogg|mkv)$/i.test(file.name)) {
    if (file.size > MEDIA_LIMITS.VIDEO_MAX_BYTES) {
      return {
        valid: false,
        error: `Video size (${sizeMB} MB) exceeds the 50 MB limit. For WhatsApp delivery, please select a video under 50 MB.`
      };
    }
  } else {
    if (file.size > MEDIA_LIMITS.DOCUMENT_MAX_BYTES) {
      return {
        valid: false,
        error: `Document size (${sizeMB} MB) exceeds the 50 MB limit. Maximum allowed size is 50 MB.`
      };
    }
  }

  return { valid: true };
}

export function validateBrainDocumentUpload(file) {
  if (!file) return { valid: false, error: "No file selected." };

  if (!isFileExtensionAllowed(file.name)) {
    return {
      valid: false,
      error: `Unsupported file format. Allowed formats: ${ALLOWED_FILE_EXTENSIONS.replace(/,/g, ', ')}`
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "Uploaded file is empty." };
  }

  if (file.size > MEDIA_LIMITS.DOCUMENT_MAX_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Document size (${sizeMB} MB) exceeds the 50 MB limit. Maximum allowed size is 50 MB.`
    };
  }

  return { valid: true };
}

export async function compressImageClientSide(file, maxDimension = 2048, quality = 0.85) {
  if (!file || file.size <= 2 * 1024 * 1024) return file;
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp)$/i.test(file.name)) return file;

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                resolve(file);
                return;
              }
              const outputName = file.name.replace(/\.[^.]+$/, ".jpg");
              const compressedFile = new File([blob], outputName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}
