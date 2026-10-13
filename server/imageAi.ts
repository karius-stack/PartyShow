// Bildebehandling med OpenAI sitt Images edit-API: fjerner bakgrunnen og gir
// deltakeren en artig/stilig positur. Uten OPENAI_API_KEY brukes originalbildet.

const API_URL = 'https://api.openai.com/v1/images/edits';
const DEFAULT_MODEL = 'gpt-image-1.5';
const TIMEOUT_MS = 180_000;

export const IMAGE_PROMPT = [
  'Remove the background completely so only the person remains on a fully transparent background.',
  'Keep their face, identity, skin tone, hair, clothing and costume exactly as they are – do not add or change any outfit.',
  'Re-pose them in a fun, confident and stylish party pose, like a star posing for the camera.',
  'Show as much of the body as the photo allows, centered and not cropped at the head.',
  'Photorealistic, flattering lighting, no text, no frames, no extra objects or people.',
].join(' ');

export function imageAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function mimeTypeFor(fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] ?? 'image/jpeg';
}

/** Sender bildet til OpenAI og returnerer et PNG-bilde. */
export async function stylizePortrait(photo: Buffer, fileName: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY er ikke satt');
  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL;

  const send = (withTransparency: boolean) => {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', IMAGE_PROMPT);
    form.append('image', new Blob([new Uint8Array(photo)], { type: mimeTypeFor(fileName) }), fileName);
    form.append('size', '1024x1536');
    form.append('quality', 'medium');
    form.append('output_format', 'png');
    if (withTransparency) {
      form.append('background', 'transparent');
      form.append('input_fidelity', 'high');
    }
    return fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  };

  let res = await send(true);
  if (res.status === 400) {
    // Ikke alle modeller støtter gjennomsiktig bakgrunn / input_fidelity – prøv uten.
    console.warn(`OpenAI avviste forespørselen med transparent bakgrunn (${model}): ${await res.text()}`);
    res = await send(false);
  }
  if (!res.ok) throw new Error(`OpenAI svarte ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI returnerte ikke noe bilde');
  return Buffer.from(b64, 'base64');
}

/** Enkel kø slik at vi ikke sender alle bildene til OpenAI samtidig. */
export class ImageQueue {
  private waiting: number[] = [];
  private active = 0;

  constructor(
    private readonly process: (id: number) => Promise<void>,
    private readonly concurrency = 2,
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
