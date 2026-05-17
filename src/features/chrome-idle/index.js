const IDLE_AFTER_MS = 3000;
const ACTIVE = 'active';
const IDLE = 'idle';

export function startChromeIdleWatcher() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  let timer = null;

  const setActivity = (value) => {
    if (body.dataset.activity !== value) body.dataset.activity = value;
  };

  const goIdle = () => setActivity(IDLE);

  const bumpActive = () => {
    setActivity(ACTIVE);
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(goIdle, IDLE_AFTER_MS);
  };

  ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel']
    .forEach((evt) => document.addEventListener(evt, bumpActive, { passive: true, capture: true }));

  bumpActive();
}
