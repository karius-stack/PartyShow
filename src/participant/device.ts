const DEVICE_KEY = 'partyshow-device-id';

/** `crypto.randomUUID` krever HTTPS, men mobilene bruker vanlig http på det lokale nettet. */
function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

let fallbackId: string | null = null;

/** Fast id for denne mobilen, slik at hver enhet bare kan registrere seg én gang. */
export function getDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) return stored;
    const id = randomId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    // Privat modus e.l. – id-en gjelder da til siden lastes på nytt.
    return (fallbackId ??= randomId());
  }
}

const MAX_SIDE = 1536;

/** Skalerer ned og konverterer til JPEG før opplasting, så det går raskt over Wi-Fi. */
export async function preparePhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (blob) return blob;
  } catch {
    // Faller tilbake til originalfilen hvis nettleseren ikke kan lese formatet.
  }
  return file;
}
