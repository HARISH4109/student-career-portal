import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { ValidationError } from '@/shared/errors/app-error';
import { POSTER_ALLOWED_MIMES, POSTER_MAX_SIZE, validateFileUpload } from '@/shared/security/file-validation';

export function getUploadsDir(): string {
  // If running from apps/api, root is ../..
  const isApiSubdir = fs.existsSync(path.resolve(process.cwd(), '../../package.json'));
  const rootDir = isApiSubdir ? path.resolve(process.cwd(), '../..') : process.cwd();
  return path.resolve(rootDir, 'uploads');
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_FILE_SIZE = POSTER_MAX_SIZE; // 5MB

/** Verify image magic bytes so spoofed MIME headers cannot persist non-image payloads. */
function hasValidImageMagicBytes(filePath: string, mimeType: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    if (bytesRead < 4) return false;

    if (mimeType === 'image/jpeg') {
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    }
    if (mimeType === 'image/gif') {
      return buf.subarray(0, 4).toString('ascii') === 'GIF8';
    }
    if (mimeType === 'image/webp') {
      return (
        bytesRead >= 12 &&
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

function getPostersDir(): string {
  const postersDir = path.resolve(getUploadsDir(), 'posters');
  if (!fs.existsSync(postersDir)) {
    fs.mkdirSync(postersDir, { recursive: true });
  }
  return postersDir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getPostersDir());
  },
  filename: (_req, file, cb) => {
    // Derive extension strictly from validated MIME type, never client filename
    const ext = MIME_TO_EXT[file.mimetype.toLowerCase()];
    if (!ext) {
      return cb(new Error('Unsupported MIME type'), '');
    }
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `poster-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!MIME_TO_EXT[file.mimetype.toLowerCase()]) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'));
    }
    cb(null, true);
  },
});

// Middleware supporting either 'file' or 'poster' field
export const uploadPosterMiddleware: RequestHandler = (req, res, next) => {
  // Try 'file' first, or 'poster'
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'poster', maxCount: 1 },
  ])(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ValidationError('File size limit exceeded (maximum 5MB)'));
        }
        return next(new ValidationError(err.message));
      }
      if (err instanceof Error) {
        return next(new ValidationError(err.message));
      }
      return next(new ValidationError('File upload failed'));
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const uploadedFile = files?.file?.[0] ?? files?.poster?.[0];

    if (!uploadedFile) {
      return next(new ValidationError('No file provided for upload'));
    }

    const check = validateFileUpload(
      {
        originalname: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
      },
      { allowedMimes: POSTER_ALLOWED_MIMES, maxSize: MAX_FILE_SIZE },
    );

    if (!check.valid || !hasValidImageMagicBytes(uploadedFile.path, uploadedFile.mimetype.toLowerCase())) {
      fs.unlink(uploadedFile.path, () => {});
      return next(new ValidationError(check.reason ?? 'Uploaded file content does not match declared image type'));
    }

    // Attach uploadedFile to req.file for standard downstream access
    req.file = uploadedFile;
    next();
  });
};

