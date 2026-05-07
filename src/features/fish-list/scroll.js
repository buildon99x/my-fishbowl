export function captureFishListScroll(root, appState) {
  const fishList = root.querySelector('[data-fish-list]');
  if (!fishList) return;

  appState.fishListScrollTop = fishList.scrollTop;
}

export function restoreFishListScroll(root, appState) {
  const fishList = root.querySelector('[data-fish-list]');
  if (!fishList) return;

  fishList.scrollTop = appState.fishListScrollTop ?? 0;
}
