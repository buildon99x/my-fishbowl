// Public storage surface. External modules import from this directory and
// receive the same loadAquarium / saveAquarium API the original storage.js had.
export { loadAquarium, saveAquarium } from './sync.js';
export { reconcileAquarium, flushRemoteWrite, syncState } from './sync.js';
export { renderConflictCard, bindConflictCard } from './conflict-card.js';
export { renderSpriteFallback, attachSpriteFallback } from './sprite-fallback.js';
