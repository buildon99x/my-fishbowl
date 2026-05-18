const IDLE_AFTER_MS = 3000;
// pointermove fires per frame while the user drags; rate-limit our work so
// we don't reset the timer 60×/sec.
const ACTIVITY_THROTTLE_MS = 120;
const ACTIVE = 'active';
const IDLE = 'idle';

export function startChromeIdleWatcher() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  let timer = null;
  let lastBumpAt = 0;

  const setActivity = (value) => {
    if (body.dataset.activity !== value) body.dataset.activity = value;
  };

  const goIdle = () => setActivity(IDLE);

  const bumpActive = () => {
    const now = performance.now();
    if (now - lastBumpAt < ACTIVITY_THROTTLE_MS) return;
    lastBumpAt = now;
    setActivity(ACTIVE);
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(goIdle, IDLE_AFTER_MS);
  };

  ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel']
    .forEach((evt) => document.addEventListener(evt, bumpActive, { passive: true, capture: true }));
  // Focus changes (keyboard Tab) also count as activity so chrome doesn't
  // stay faded while a Tab user is navigating.
  document.addEventListener('focusin', bumpActive, { capture: true });

  bumpActive();
}
