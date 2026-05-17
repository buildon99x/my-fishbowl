export function bindDrawerEvents(root, appState, { render }) {
  const openBtn = root.querySelector('[data-drawer-open]');
  const closeBtn = root.querySelector('[data-drawer-close]');
  const backdrop = root.querySelector('[data-drawer-backdrop]');

  const close = () => {
    if (!appState.drawerOpen) return;
    appState.drawerOpen = false;
    render();
  };

  const open = () => {
    if (appState.drawerOpen) return;
    appState.drawerOpen = true;
    render();
  };

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  // Help link sits inside the drawer body. When the user taps it, the
  // onboarding resets — but the drawer would still cover the restarted
  // onboarding step. Close the drawer first so the overlay is visible.
  root.querySelector('[data-onboarding-help]')?.addEventListener('click', () => {
    appState.drawerOpen = false;
  });
}
