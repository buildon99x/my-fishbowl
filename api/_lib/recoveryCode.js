import { createHash } from 'node:crypto';

/**
 * Kid-friendly English word pool (~200 words: animals, colors, nature, food).
 * Words are short, easy to read/type, and free of ambiguous or inappropriate content.
 */
const WORD_POOL = [
  // Animals
  'ant', 'bear', 'bee', 'bird', 'cat', 'clam', 'crab', 'crow', 'deer',
  'dove', 'duck', 'eel', 'elk', 'fish', 'frog', 'gull', 'hawk', 'hen',
  'ibis', 'jay', 'lamb', 'lark', 'lion', 'lynx', 'mole', 'moth', 'mule',
  'newt', 'owl', 'pony', 'puffin', 'quail', 'robin', 'seal', 'shrimp',
  'slug', 'snail', 'swan', 'toad', 'vole', 'wasp', 'wren', 'yak',
  'zebra', 'bunny', 'chipmunk', 'dolphin', 'ferret', 'gecko', 'hamster',
  'iguana', 'jaguar', 'koala', 'lemur', 'meerkat', 'narwhal', 'otter',
  'panda', 'penguin', 'rabbit', 'raccoon', 'salmon', 'skunk', 'sloth',
  'snapper', 'sparrow', 'squid', 'starfish', 'toucan', 'turtle', 'walrus',
  'wombat',
  // Colors / shades
  'amber', 'aqua', 'azure', 'beige', 'blush', 'bronze', 'brown', 'coral',
  'cream', 'crimson', 'cyan', 'fern', 'gold', 'green', 'grey', 'indigo',
  'ivory', 'jade', 'khaki', 'lavender', 'lemon', 'lilac', 'lime', 'magenta',
  'maroon', 'mauve', 'mint', 'navy', 'ochre', 'olive', 'orange', 'peach',
  'pearl', 'pink', 'plum', 'purple', 'rose', 'ruby', 'rust', 'scarlet',
  'silver', 'sky', 'slate', 'teal', 'violet', 'white', 'yellow',
  // Nature / outdoors
  'acorn', 'brook', 'cave', 'cliff', 'cloud', 'comet', 'creek', 'dew',
  'dune', 'fern', 'field', 'fjord', 'flame', 'flint', 'foam', 'forest',
  'frost', 'gale', 'glade', 'glen', 'grove', 'hail', 'hill', 'island',
  'ivy', 'lake', 'leaf', 'log', 'marsh', 'meadow', 'mist', 'moon',
  'moss', 'mountain', 'mud', 'pebble', 'pine', 'pond', 'rain', 'reed',
  'ridge', 'river', 'rock', 'sand', 'shell', 'shore', 'sky', 'snow',
  'star', 'stone', 'storm', 'stream', 'sun', 'tide', 'tree', 'vale',
  'valley', 'vine', 'wave', 'wind',
  // Food / plants
  'acai', 'apple', 'basil', 'bean', 'berry', 'biscuit', 'blossom', 'bubble',
  'butter', 'cake', 'candy', 'carrot', 'cherry', 'chestnut', 'clover',
  'cocoa', 'coconut', 'cookie', 'corn', 'daisy', 'fig', 'ginger', 'grape',
  'guava', 'honey', 'jam', 'kiwi', 'lemon', 'lentil', 'lettuce', 'lime',
  'lychee', 'mango', 'maple', 'melon', 'mint', 'muffin', 'noodle', 'oat',
  'olive', 'onion', 'papaya', 'pea', 'peach', 'pear', 'pepper', 'pie',
  'plum', 'poppy', 'potato', 'pretzel', 'pumpkin', 'raisin', 'raspberry',
  'rice', 'sesame', 'sprout', 'squash', 'strawberry', 'tangerine', 'toast',
  'tomato', 'tulip', 'vanilla', 'walnut', 'wheat',
];

/**
 * Generates a recovery code in the format `word-word-NN`
 * (e.g., `frog-bubble-42`).
 *
 * Two distinct words are picked at random from WORD_POOL and combined with
 * a zero-padded two-digit number (00–99).
 *
 * @returns {string}
 */
export function generateRecoveryCode() {
  const poolSize = WORD_POOL.length;

  // Pick two indices — retry if they collide to guarantee distinct words.
  let idx1 = Math.floor(Math.random() * poolSize);
  let idx2 = Math.floor(Math.random() * poolSize);
  while (idx2 === idx1) {
    idx2 = Math.floor(Math.random() * poolSize);
  }

  const word1 = WORD_POOL[idx1];
  const word2 = WORD_POOL[idx2];
  const num = String(Math.floor(Math.random() * 100)).padStart(2, '0');

  return `${word1}-${word2}-${num}`;
}

/**
 * Returns the SHA-256 hex digest of a recovery code string.
 * Only the hash is ever stored — the plain code is never persisted.
 *
 * @param {string} code  Plain-text recovery code.
 * @returns {string}     64-character lowercase hex string.
 */
export function hashCode(code) {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

/**
 * Returns the KV key used to store recovery code metadata.
 *
 * @param {string} hash  SHA-256 hex of the code.
 * @returns {string}
 */
export function buildRecoveryKey(hash) {
  return `recovery:${hash}`;
}

/**
 * Returns the KV key that tracks the currently active code hash for an aquarium.
 *
 * @param {string} aquariumId
 * @returns {string}
 */
export function buildActiveKey(aquariumId) {
  return `recovery-active:${aquariumId}`;
}

/**
 * Returns the KV key used as a short-lived distributed lock during redemption.
 *
 * @param {string} hash  SHA-256 hex of the code.
 * @returns {string}
 */
export function buildLockKey(hash) {
  return `recovery-lock:${hash}`;
}
