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
}
