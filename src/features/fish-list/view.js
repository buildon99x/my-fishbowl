import { ALGAE_MAX_LEVEL, getAlgaeStateName } from '../algae/index.js';
import { escapeHtml } from '../../lib/utils.js';

export function formatRegisteredTime(value) {
  if (!value) {
    return '-';
  }

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '-';
  }
}

function getPropType(item) {
  return item?.type === 'deco' ? 'deco' : 'fish';
}

export function renderFishList(fishes, selectedFishId, editingTarget) {
  const visibleProps = fishes.filter((item) => !item?.pendingDelete);

  if (visibleProps.length === 0) {
    return '<p class="fish-list-empty">위쪽 + 버튼을 눌러 첫 친구를 만들어 보세요!</p>';
  }

  const editingId = editingTarget?.id ?? null;

  return `
    <div class="fish-list" role="list" data-fish-list>
      ${visibleProps
        .map((item) => {
          const type = getPropType(item);
          const isFish = type === 'fish';
          const badgeIcon = isFish ? '🐟' : '🪨';
          const badgeText = isFish ? '물고기' : '장식';
          const deleteLabel = isFish ? '물고기 삭제' : '장식 삭제';
          const isEditing = item.id === editingId;
          return `
            <div class="fish-list-item ${item.id === selectedFishId ? 'is-selected' : ''} is-${type}" role="listitem" data-fish-id="${item.id}">
              <button class="fish-list-select" type="button" data-select-fish="${item.id}" aria-pressed="${item.id === selectedFishId}">
                <img src="${item.imageUrl}" alt="" class="fish-list-thumb">
                <span class="fish-list-name">${escapeHtml(item.name)}</span>
                <span class="fish-list-badge fish-list-badge-${type}" aria-label="${badgeText}">${badgeIcon} ${badgeText}</span>
                <time class="fish-list-time" datetime="${escapeHtml(item.createdAt)}">${formatRegisteredTime(item.createdAt)}</time>
              </button>
              <div class="fish-list-actions">
                <button class="fish-action-button ${isEditing ? 'is-active' : ''}" type="button" data-edit-fish="${item.id}" title="편집">
                  ✏️
                </button>
                <button class="fish-action-button" type="button" data-toggle-fish-hidden="${item.id}">
                  ${item.hidden ? '보이기' : '감추기'}
                </button>
                <button class="fish-action-button fish-action-danger" type="button" data-delete-fish="${item.id}" title="${deleteLabel}" aria-label="${deleteLabel}">
                  삭제
                </button>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderCountChips(fishes) {
  const visible = fishes.filter((item) => !item?.pendingDelete);
  const fishCount = visible.filter((item) => getPropType(item) === 'fish').length;
  const decoCount = visible.filter((item) => getPropType(item) === 'deco').length;
  const totalCount = visible.length;

  return `
    <div class="prop-count-chips" aria-label="오브젝트 카운트">
      <span class="prop-count-chip prop-count-total">전체 ${totalCount}</span>
      <span class="prop-count-chip prop-count-fish ${fishCount === 0 ? 'is-empty' : ''}">🐟 ${fishCount}</span>
      <span class="prop-count-chip prop-count-deco ${decoCount === 0 ? 'is-empty' : ''}">🪨 ${decoCount}</span>
    </div>
  `;
}

export function renderAquariumStatus(aquarium, appState) {
  const bodyId = 'fish-list-panel-body';
  const visibleProps = aquarium.fishes.filter((item) => !item?.pendingDelete);
  const fishCount = visibleProps.filter((item) => getPropType(item) === 'fish').length;

  return `
    <aside class="aquarium-status ${appState.isFishListCollapsed ? 'is-collapsed' : ''}" aria-labelledby="aquarium-title">
      <button
        class="aquarium-status-toggle"
        type="button"
        data-toggle-fish-list
        aria-expanded="${!appState.isFishListCollapsed}"
        aria-controls="${bodyId}"
      >
        <span class="aquarium-status-toggle-copy">
          <span id="aquarium-title">오브젝트 목록</span>
          <span>${visibleProps.length}개</span>
        </span>
        <span class="aquarium-status-toggle-icon" aria-hidden="true">
          <span>${appState.isFishListCollapsed ? '+' : '-'}</span>
          <span>${appState.isFishListCollapsed ? '펼치기' : '접기'}</span>
        </span>
      </button>

      <div class="aquarium-status-body" id="${bodyId}" ${appState.isFishListCollapsed ? 'hidden' : ''}>
        ${renderCountChips(aquarium.fishes)}
        <dl class="status-list">
          <div>
            <dt>청결도</dt>
            <dd>${aquarium.cleanliness}%</dd>
          </div>
          <div>
            <dt>물고기 수</dt>
            <dd>${fishCount}</dd>
          </div>
          <div>
            <dt>이끼 단계</dt>
            <dd>${aquarium.algaeLevel} / ${ALGAE_MAX_LEVEL} · ${getAlgaeStateName(aquarium.algaeLevel)}</dd>
          </div>
        </dl>
        ${renderFishList(aquarium.fishes, appState.selectedFishId, appState.propPanel.editingTarget)}
      </div>
    </aside>
  `;
}

export function renderUndoSnackbar(undoState) {
  if (!undoState?.visible) return '';
  const name = undoState.name || '오브젝트';
  return `
    <div class="prop-undo-snackbar" role="status" aria-live="polite" data-undo-snackbar>
      <span>${escapeHtml(name)}을(를) 지웠어요.</span>
      <button class="button button-secondary" type="button" data-undo-delete>되돌리기</button>
    </div>
  `;
}
