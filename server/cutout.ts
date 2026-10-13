// Fjerner bakgrunnen rundt personen på bildet lokalt med MODNet (portrett-
// utklipping, Apache-2.0). Personen og klærne beholdes piksel for piksel –
// modellen lager bare en maske for hva som er bakgrunn.

import path from 'node:path';
import { AutoModel, AutoProcessor, env, RawImage, type PreTrainedModel, type Processor } from '@huggingface/transformers';
import sharp from 'sharp';
import { DATA_DIR } from './db.ts';

const MODEL_ID = 'Xenova/modnet';

// Modellen lastes ned første gang og lagres sammen med dataene, så festen ikke trenger internett.
env.cacheDir = path.join(DATA_DIR, 'models');

let loading: Promise<{ model: PreTrainedModel; processor: Processor }> | null = null;

function loadModel() {
  loading ??= Promise.all([
    AutoModel.from_pretrained(MODEL_ID, { dtype: 'fp32' }),
    AutoProcessor.from_pretrained(MODEL_ID),
  ]).then(([model, processor]) => ({ model, processor }));
  // Mislykket lasting (f.eks. uten nett) skal kunne prøves på nytt.
  loading.catch(() => (loading = null));
  return loading;
}

/** Laster modellen i bakgrunnen ved oppstart, så første gjest slipper å vente. */
export function warmUpCutout() {
  loadModel()
    .then(() => console.log('Modellen for bakgrunnsfjerning er klar.'))
    .catch((error) => console.error('Kunne ikke laste modellen for bakgrunnsfjerning:', error));
}

/** Returnerer et PNG med gjennomsiktig bakgrunn, beskåret til personen. */
export async function cutOutPerson(photo: Buffer): Promise<Buffer> {
  const { model, processor } = await loadModel();

  // `rotate()` retter opp bilder etter EXIF-retning før vi leser pikslene.
  const { data, info } = await sharp(photo).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = new RawImage(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height, 3);

  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });
  const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(info.width, info.height);

  // Originalpikslene + masken som alfakanal.
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    rgba[j] = data[i];
    rgba[j + 1] = data[i + 1];
    rgba[j + 2] = data[i + 2];
    rgba[j + 3] = mask.data[i / 3];
  }

  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();
}

/** Enkel kø slik at bildene behandles ett om gangen (modellen bruker mye CPU). */
export class ImageQueue {
  private waiting: number[] = [];
  private active = 0;

  constructor(
    private readonly process: (id: number) => Promise<void>,
    private readonly concurrency = 1,
  ) {}

  add(id: number) {
    if (!this.waiting.includes(id)) this.waiting.push(id);
    this.pump();
  }

  private pump() {
    while (this.active < this.concurrency && this.waiting.length > 0) {
      const id = this.waiting.shift()!;
      this.active++;
      this.process(id)
        .catch((error) => console.error(`Bildebehandling feilet for deltaker ${id}:`, error))
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }
}
