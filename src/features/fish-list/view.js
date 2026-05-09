import { ALGAE_MAX_LEVEL, getAlgaeStateName } from '../algae/index.js';
import { escapeHtml } from '../../lib/utils.js';
import { getFishThumbTransform } from '../../lib/fishSpriteStyle.js';

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

export function renderFishList(fishes, selectedFishId, editingTarget) {
  if (fishes.length === 0) {
    return '<p class="fish-list-empty">등록된 물고기가 없습니다.</p>';
  }

  const editingFishId = editingTarget?.type === 'fish' ? editingTarget.id : null;

  return `
    <div class="fish-list" role="list" data-fish-list>
      ${fishes
        .map(
          (fish) => `
            <div class="fish-list-item ${fish.id === selectedFishId ? 'is-selected' : ''}" role="listitem" data-fish-id="${fish.id}">
              <button class="fish-list-select" type="button" data-select-fish="${fish.id}" aria-pressed="${fish.id === selectedFishId}">
                <img src="${fish.imageUrl}" alt="" class="fish-list-thumb" style="transform: ${getFishThumbTransform(fish)};">
                <span class="fish-list-name">${escapeHtml(fish.name)}</span>
                <time class="fish-list-time" datetime="${escapeHtml(fish.createdAt)}">${formatRegisteredTime(fish.createdAt)}</time>
              </button>
              <div class="fish-list-actions">
                <button class="fish-action-button ${fish.id === editingFishId ? 'is-active' : ''}" type="button" data-edit-fish="${fish.id}" title="편집">
                  ✏️
                </button>
                <button class="fish-action-button" type="button" data-toggle-fish-hidden="${fish.id}">
                  ${fish.hidden ? '보이기' : '감추기'}
                </button>
                <button class="fish-action-button fish-action-danger" type="button" data-delete-fish="${fish.id}">
                  삭제
                </button>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

export function renderAquariumStatus(aquarium, appState) {
  const bodyId = 'fish-list-panel-body';

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
          <span id="aquarium-title">물고기 목록</span>
          <span>${aquarium.fishes.length}마리</span>
        </span>
        <span class="aquarium-status-toggle-icon" aria-hidden="true">
          <span>${appState.isFishListCollapsed ? '+' : '-'}</span>
          <span>${appState.isFishListCollapsed ? '펼치기' : '접기'}</span>
        </span>
      </button>

      <div class="aquarium-status-body" id="${bodyId}" ${appState.isFishListCollapsed ? 'hidden' : ''}>
        <dl class="status-list">
          <div>
            <dt>청결도</dt>
            <dd>${aquarium.cleanliness}%</dd>
          </div>
          <div>
            <dt>물고기 수</dt>
            <dd>${aquarium.fishes.length}</dd>
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
