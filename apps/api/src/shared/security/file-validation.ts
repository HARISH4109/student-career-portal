import path from 'node:path';

export const RESUME_ALLOWED_MIMES = ['application/pdf'] as const;
export const RESUME_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const POSTER_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
export const POSTER_MAX_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

export interface FileValidationOptions {
  allowedMimes: readonly string[];
  maxSize: number;
}

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
}

export interface UploadedFileDescriptor {
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Validates file upload attributes: MIME type, file size, and extension/MIME consistency.
 * Prevents file extension spoofing and directory traversal in original names.
 */
export function validateFileUpload(
  file: UploadedFileDescriptor,
  options: FileValidationOptions,
): FileValidationResult {
  // Check null bytes or control characters in filename
  // eslint-disable-next-line no-control-regex
  if (/[\0\x00-\x1f\x7f]/.test(file.originalname)) {
    return { valid: false, reason: 'Filename contains invalid or malicious characters.' };
  }

  // Prevent directory traversal
  const baseName = path.basename(file.originalname);
  if (baseName !== file.originalname && !file.originalname.includes('\\')) {
    return { valid: false, reason: 'Filename path traversal detected.' };
  }

  // Check file size limit
  if (file.size <= 0) {
    return { valid: false, reason: 'Uploaded file cannot be empty.' };
  }
  if (file.size > options.maxSize) {
    const maxMb = Math.round(options.maxSize / (1024 * 1024));
    return {
      valid: false,
      reason: `File size exceeds the allowed limit of ${String(maxMb)}MB.`,
    };
  }

  // Check MIME type allowlist
  const normalizedMime = file.mimetype.toLowerCase();
  if (!options.allowedMimes.includes(normalizedMime)) {
    return {
      valid: false,
      reason: `MIME type "${file.mimetype}" is not permitted. Allowed: ${options.allowedMimes.join(', ')}`,
    };
  }

  // Check file extension consistency with declared MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const validExts = MIME_EXTENSION_MAP[normalizedMime];
  if (validExts && !validExts.includes(ext)) {
    return {
      valid: false,
      reason: `File extension "${ext}" does not match declared MIME type "${file.mimetype}". Expected: ${validExts.join(', ')}`,
    };
  }

  return { valid: true };
}

