const SPRITE_WIDTH = 240;
const SPRITE_HEIGHT = 160;

function loadImage(src) {
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
