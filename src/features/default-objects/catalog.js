import { resizeImageToSprite } from '../../lib/spriteResize.js';
import { DEFAULT_OBJECTS_MANIFEST } from '../../assets/default-objects/manifest.js';

const dataUrlCache = new Map();
const inflight = new Map();

function fetchAsDataUrl(spriteUrl) {
  return fetch(spriteUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${spriteUrl}: ${res.status}`);
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener('load', () => resolve(reader.result));
          reader.addEventListener('error', () => reject(reader.error));
          reader.readAsDataURL(blob);
        }),
    );
}

export function getManifestEntry(id) {
  return DEFAULT_OBJECTS_MANIFEST.find((entry) => entry.id === id) ?? null;
}

export async function loadEntryDataUrl(entry) {
  if (!entry) return null;
  const cached = dataUrlCache.get(entry.id);
  if (cached) return cached;
  if (inflight.has(entry.id)) return inflight.get(entry.id);

  const promise = (async () => {
    try {
      const sourceDataUrl = await fetchAsDataUrl(entry.spriteUrl);
      const sprite = await resizeImageToSprite(sourceDataUrl);
      dataUrlCache.set(entry.id, sprite);
      return sprite;
    } finally {
      inflight.delete(entry.id);
    }
  })();
  inflight.set(entry.id, promise);
  return promise;
}

export function prefetchAll() {
  for (const entry of DEFAULT_OBJECTS_MANIFEST) {
    if (!dataUrlCache.has(entry.id) && !inflight.has(entry.id)) {
      loadEntryDataUrl(entry).catch((err) => {
        console.warn('default-objects prefetch failed', entry.id, err);
      });
    }
  }
}

export function getNextNameWithSuffix(existingNames, baseName) {
  if (!existingNames.includes(baseName)) return baseName;
  let i = 2;
  while (existingNames.includes(`${baseName} (${i})`)) i += 1;
  return `${baseName} (${i})`;
}
