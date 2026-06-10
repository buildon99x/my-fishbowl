// 2x the original 240x160 so uploaded sprites stay crisp at the aquarium render
// size on high-DPI screens. Drawn sprites bypass this resize and keep their
// native 720x480 canvas resolution (see fish-input/index.js) — do NOT route the
// drawing path through here or it would downgrade drawn crispness.
export const SPRITE_WIDTH = 480;
export const SPRITE_HEIGHT = 320;

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.src = src;
  });
}

export async function resizeImageToSprite(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const scale = Math.min(SPRITE_WIDTH / image.naturalWidth, SPRITE_HEIGHT / image.naturalHeight);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const x = Math.round((SPRITE_WIDTH - width) / 2);
  const y = Math.round((SPRITE_HEIGHT - height) / 2);

  canvas.width = SPRITE_WIDTH;
  canvas.height = SPRITE_HEIGHT;
  context.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, x, y, width, height);

  return canvas.toDataURL('image/png');
}
