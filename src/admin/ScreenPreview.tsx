import { useEffect, useRef } from 'react';

/** Viser storskjermen nedskalert fra 1920×1080 til kortets bredde. */
export function ScreenPreview() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      el.style.setProperty('--preview-scale', String(entry.contentRect.width / 1920));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="preview" ref={ref}>
      <iframe src="/" title="Storskjerm" tabIndex={-1} />
    </div>
  );
}
