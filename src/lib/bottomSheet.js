// Shared bottom-sheet interaction helpers (S-037).
//
// Extracted from the fish-input sheet so multiple windows (직접 만들기 / 카탈로그)
// reuse the same grabber-drag, backdrop-dismiss, and keyboard-inset behaviour.
// These operate purely on a state object exposing `{ isExpanded, sheetStage }`
// and a `render` callback, so they stay domain-agnostic (src/lib placement per
// Claude.md / ARCHITECTURE.md directory rules).
//
// Hooks (shared across every sheet that opts in):
//   - grabber element:  `.bottom-sheet-grabber`
//   - backdrop element:  `.bottom-sheet-backdrop`

function closeSheet(state) {
  state.sheetStage = 'closed';
  state.isExpanded = false;
}

// Short tap = toggle peek<->full. Drag up >= 40 = full. Drag down >= 40 from
// peek = close. (Identical thresholds to the pre-split S-029 sheet.)
export function bindSheetGrabber(panel, state, render) {
  const grabber = panel.querySelector('.bottom-sheet-grabber');
  if (!grabber) return;

  let startY = 0;
  let dragging = false;
  let startStage = 'peek';

  grabber.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    dragging = true;
    startY = e.clientY;
    startStage = state.sheetStage === 'full' ? 'full' : 'peek';
    grabber.setPointerCapture(e.pointerId);
  });

  grabber.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    if (!dragging) return;
    dragging = false;
    grabber.releasePointerCapture(e.pointerId);
    const dy = e.clientY - startY;
    if (Math.abs(dy) < 10) {
      state.sheetStage = startStage === 'full' ? 'peek' : 'full';
      render();
      return;
    }
    if (dy <= -40) {
      state.sheetStage = 'full';
      render();
      return;
    }
    if (dy >= 40) {
      if (startStage === 'full') {
        state.sheetStage = 'peek';
      } else {
        closeSheet(state);
      }
      render();
    }
  });

  grabber.addEventListener('pointercancel', () => { dragging = false; });
}

// Tapping the dimmed backdrop closes the sheet.
export function bindSheetBackdrop(root, state, render) {
  const backdrop = root.querySelector('.bottom-sheet-backdrop');
  backdrop?.addEventListener('click', () => {
    closeSheet(state);
    render();
  });
}

// Track the on-screen keyboard height into --keyboard-inset so a sheet can lift
// above it. Bound once for the app lifetime (idempotent), so any number of
// sheets can call it without stacking listeners.
let keyboardInsetBound = false;
export function bindKeyboardInset() {
  if (keyboardInsetBound) return;
  if (typeof window === 'undefined' || !window.visualViewport) return;
  keyboardInsetBound = true;
  const update = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    const inset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
  };
  window.visualViewport.addEventListener('resize', update);
  window.visualViewport.addEventListener('scroll', update);
  update();
}
