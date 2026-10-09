import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import type { MediaType } from '../shared/types.ts';
import { UPLOAD_DIR } from './db.ts';
import { isValidPin } from './sockets.ts';

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^(image|video)\//.test(file.mimetype)),
});

export const uploadRouter = Router();

uploadRouter.post(
  '/api/uploads',
  (req, res, next) => {
    if (isValidPin(req.get('x-admin-pin'))) next();
    else res.status(401).json({ error: 'Feil PIN-kode' });
  },
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Last opp et bilde eller en video' });
      return;
    }
    const mediaType: MediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    res.json({ url: `/uploads/${req.file.filename}`, mediaType });
  },
);
