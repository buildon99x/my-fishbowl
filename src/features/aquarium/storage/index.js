/**
 * Public API for aquarium persistence.
 *
 * Preserves the original `loadAquarium` / `saveAquarium` export surface so
 * that all existing callers (`fish-actions.js`, `main.js`, …) continue to
 * work without any import-path changes.
 *
 * When VITE_BACKEND_ENABLED=true the calls are routed through sync.js
 * (write-through + background reconcile).  Otherwise local.js is used
 * directly — identical to the old storage.js behaviour.
 */

import {
  loadAquariumThroughSync,
  saveAquariumThroughSync,
} from './sync.js';

/**
 * Loads the aquarium.
 * When BACKEND_ENABLED=true, local storage is read immediately and a
 * background reconcile with the server is started.
 *
 * @returns {import('../model.js').Aquarium}
 */
export function loadAquarium() {
  return loadAquariumThroughSync();
}

/**
 * Saves the aquarium.
 * When BACKEND_ENABLED=true, local storage is written immediately and a
 * debounced PUT to the server is scheduled.
 *
 * @param {import('../model.js').Aquarium} aquarium
 */
export function saveAquarium(aquarium) {
  saveAquariumThroughSync(aquarium);
}
