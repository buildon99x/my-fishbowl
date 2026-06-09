import {
  getManifestEntry,
  loadEntryDataUrl,
  getNextNameWithSuffix,
  prefetchAll,
} from './catalog.js';
import { checkDebounce, markCtaSeen } from './state.js';
import { prefersReducedMotion } from '../../lib/utils.js';
import { bindSheetBackdrop, bindSheetGrabber } from '../../lib/bottomSheet.js';

function pulseCard(card, className, durationMs) {
  if (!card) return;
  card.classList.add(className);
  setTimeout(() => card.classList.remove(className), durationMs);
}

function setLoadingState(card, on) {
  if (!card) return;
  card.classList.toggle('default-objects-card--ready', on);
}

function peekModal(modal) {
  if (!modal || prefersReducedMotion()) return;
  modal.classList.add('default-objects-modal--peek');
  setTimeout(() => modal.classList.remove('default-objects-modal--peek'), 700);
}

function highlightFishListItem(root, propId) {
  if (!root) return;
  requestAnimationFrame(() => {
    const item = root.querySelector(`[data-fish-id="${propId}"]`);
    if (!item) return;
    item.classList.add('fish-list-item--just-added');
    setTimeout(() => item.classList.remove('fish-list-item--just-added'), 1200);
  });
}

export function bindDefaultObjectsEvents(root, ctx) {
  const {
    state,
    aquarium,
    onRegisterEntry,
    render,
  } = ctx;

  const modal = root.querySelector('[data-default-objects-modal]');
  if (!modal) return;

  // The catalog is its own bottom-sheet window (S-037) — prefetch sprites when
  // it opens so the first tap feels instant, and wire the shared sheet gestures
  // (grabber drag / backdrop tap / close button) onto the catalog UI state.
  prefetchAll();
  markCtaSeen();

  const sheet = root.querySelector('.default-objects-sheet');
  if (sheet && render) bindSheetGrabber(sheet, state, render);
  if (render) bindSheetBackdrop(root, state, render);
  root.querySelector('[data-close-catalog]')?.addEventListener('click', () => {
    state.isExpanded = false;
    render?.();
  });

  modal.querySelectorAll('[data-default-object-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      const id = card.getAttribute('data-default-object-id');
      const entry = getManifestEntry(id);
      if (!entry) return;
      const now = performance.now();
      if (!checkDebounce(state, id, now)) {
        pulseCard(card, 'default-objects-card--debounce-pulse', 200);
        return;
      }

      setLoadingState(card, true);

      let spriteDataUrl;
      try {
        spriteDataUrl = await loadEntryDataUrl(entry);
      } catch (err) {
        console.warn('default-objects load failed', entry.id, err);
        setLoadingState(card, false);
        pulseCard(card, 'default-objects-card--error', 700);
        return;
      }
      setLoadingState(card, false);
      if (!spriteDataUrl) return;

      const existingNames = aquarium.fishes
        .filter((f) => !f.pendingDelete)
        .map((f) => f.name);
      const resolvedName = getNextNameWithSuffix(existingNames, entry.name);

      pulseCard(card, 'default-objects-card--registered', 220);

      const prop = onRegisterEntry?.({
        entry,
        spriteDataUrl,
        name: resolvedName,
        cardElement: card,
      });

      const freshModal = root.querySelector('[data-default-objects-modal]') ?? modal;
      peekModal(freshModal);

      if (prop) {
        highlightFishListItem(root, prop.id);
      }
    });
  });
}
