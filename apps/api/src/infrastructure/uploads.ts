import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { ValidationError } from '@/shared/errors/app-error';

export function getUploadsDir(): string {
  // If running from apps/api, root is ../..
  const isApiSubdir = fs.existsSync(path.resolve(process.cwd(), '../../package.json'));
  const rootDir = isApiSubdir ? path.resolve(process.cwd(), '../..') : process.cwd();
  return path.resolve(rootDir, 'uploads');
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `poster-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
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

    // Attach uploadedFile to req.file for standard downstream access
    req.file = uploadedFile;
    next();
  });
};

