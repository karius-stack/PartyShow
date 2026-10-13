/** Høyden på et portrett (bilde 3:4, utklipp som stikker opp og navneskilt) i forhold til bredden. */
const HEIGHT_RATIO = 1.8;
/** Mellomrom mellom portrettene i forhold til bredden. */
const GAP_RATIO = 0.18;

/** Største portrettbredde (px) som får plass til alle i et område på width × height. */
export function fitPortraitWidth(count: number, width: number, height: number, maxWidth: number): number {
  if (count === 0 || width <= 0 || height <= 0) return maxWidth;
  for (let w = maxWidth; w > 24; w -= 2) {
    const gap = w * GAP_RATIO;
    const cols = Math.max(1, Math.floor((width + gap) / (w + gap)));
    const rows = Math.ceil(count / cols);
    if (rows * (w * HEIGHT_RATIO + gap) - gap <= height) return w;
  }
  return 24;
}
