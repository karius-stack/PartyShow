import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import type { MediaType } from '../shared/types.ts';
import type { AppController } from './app.ts';
import { UPLOAD_DIR } from './db.ts';
import { ShowError } from './errors.ts';
import { lanAddress } from './network.ts';
import { isValidPin } from './sockets.ts';

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^(image|video)\//.test(file.mimetype)),
});

const PHOTO_MAX_MB = 15;

const photoUpload = multer({
  storage,
  limits: { fileSize: PHOTO_MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

/** Som `photoUpload.single`, men svarer med JSON-feil i stedet for Express sin feilside. */
const singlePhoto: RequestHandler = (req, res, next) => {
  photoUpload.single('photo')(req, res, (error: unknown) => {
    if (!error) return next();
    const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    res.status(400).json({ error: tooLarge ? `Bildet er for stort (maks ${PHOTO_MAX_MB} MB)` : 'Opplasting feilet' });
  });
};

export function createApiRouter(app: AppController): Router {
  const router = Router();

  router.post(
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

  // Registrering fra mobilen (/join) i kåringsmodusen.
  router.post('/api/participants', singlePhoto, (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Ta et bilde av deg selv først (JPEG, PNG eller WebP)' });
      return;
    }
    const body = req.body as { deviceId?: unknown; name?: unknown };
    try {
      app.awards.register(body.deviceId, body.name, `/uploads/${req.file.filename}`);
      res.json({ ok: true });
    } catch (error) {
      void unlink(req.file.path).catch(() => {});
      if (error instanceof ShowError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Registrering feilet:', error);
        res.status(500).json({ error: 'Noe gikk galt – prøv igjen' });
      }
    }
  });

  // Brukes av storskjermen til å lage QR-koden.
  router.get('/api/info', (_req, res) => {
    res.json({ publicUrl: process.env.PUBLIC_URL?.replace(/\/+$/, '') || null, lanAddress: lanAddress() });
  });

  return router;
}
