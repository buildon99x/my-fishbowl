// Public storage surface — preserves the same loadAquarium/saveAquarium API.
// Backend-specific helpers (reconcile, conflict-card, sprite-fallback) are
// consumed directly by their callers when BACKEND_ENABLED=true; they are
// intentionally not re-exported here to keep the public surface minimal.
export { loadAquarium, saveAquarium } from './sync.js';
