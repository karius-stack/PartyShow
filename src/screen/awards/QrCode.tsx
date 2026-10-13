import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QrCode({ value }: { value: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#05080c', light: '#f4ecd8' } })
      .then((result) => {
        if (!cancelled) setSvg(result);
      })
      .catch(() => setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [value]);

  // Innholdet er generert lokalt av qrcode-biblioteket, ikke brukerinput.
  return <div className="qr-code" role="img" aria-label={`QR-kode til ${value}`} dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />;
}
