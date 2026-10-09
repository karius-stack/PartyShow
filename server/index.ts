import { createServer } from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { UPLOAD_DIR } from './db.ts';
import { ShowController } from './show.ts';
import { registerSockets } from './sockets.ts';
import { uploadRouter } from './uploads.ts';

const PORT = Number(process.env.PORT ?? 3001);
const DIST_DIR = path.resolve(import.meta.dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(uploadRouter);
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1h' }));

if (isProduction) {
  app.use(express.static(DIST_DIR));
  // SPA-fallback slik at /admin fungerer ved direkte innlasting.
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

registerSockets(io, new ShowController());

httpServer.listen(PORT, () => {
  console.log(`PartyShow-server kjører på http://localhost:${PORT}`);
  if (!process.env.ADMIN_PIN) console.warn('ADVARSEL: ADMIN_PIN er ikke satt – /admin er åpent for alle.');
});
