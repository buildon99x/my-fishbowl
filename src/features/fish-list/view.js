import { ALGAE_MAX_LEVEL, getAlgaeStateName } from '../algae/index.js';
import { escapeHtml, safeSpriteUrl } from '../../lib/utils.js';
import { getFishThumbTransform } from '../../lib/fishSpriteStyle.js';
import { getCurrentLang } from '../../lib/i18n.js';

export function formatRegisteredTime(value) {
  if (!value) {
    return '-';
  }

  try {
    return new Intl.DateTimeFormat(getCurrentLang(), {
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

const SUFFIX_EMOJI = ['', '', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
const SUFFIX_PATTERN = /^(.*) \((\d+)\)$/;

function splitNameAndSuffix(name) {
  const match = SUFFIX_PATTERN.exec(name ?? '');
  if (!match) return { base: name ?? '', badge: '' };
  const num = Number(match[2]);
  const badge = SUFFIX_EMOJI[num] ?? `(${num})`;
  return { base: match[1], badge };
}

function renderNameWithSuffix(name) {
  const { base, badge } = splitNameAndSuffix(name);
  if (!badge) return escapeHtml(base);
  return `${escapeHtml(base)}<span class="fish-list-name-badge" aria-hidden="true">${badge}</span>`;
}

export function renderFishList(fishes, selectedFishId, editingTarget) {
  const visibleProps = fishes.filter((item) => !item?.pendingDelete);

  if (visibleProps.length === 0) {
    return `
      <div class="fish-list-empty" role="status">
        <span class="fish-list-empty-icon" aria-hidden="true">➕</span>
        <p class="fish-list-empty-text">➕ 버튼을 눌러 첫 친구를 만들어 보세요!</p>
        <span class="fish-list-empty-arrow" aria-hidden="true">↓</span>
      </div>
    `;
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
          const hideLabel = isFish
            ? (item.hidden ? '물고기 보이기' : '물고기 감추기')
            : (item.hidden ? '장식 보이기' : '장식 감추기');
          const deleteLabel = isFish ? '물고기 삭제' : '장식 삭제';
          const isEditing = item.id === editingId;
          return `
            <div class="fish-list-item ${item.id === selectedFishId || isEditing ? 'is-selected' : ''} is-${type}" role="listitem" data-fish-id="${item.id}">
              <button class="fish-list-select ${isEditing ? 'is-active' : ''}" type="button" data-select-fish="${item.id}" aria-pressed="${isEditing}">
                <img src="${escapeHtml(safeSpriteUrl(item.imageUrl))}" alt="" class="fish-list-thumb" style="transform: ${getFishThumbTransform(item)};">
                <span class="fish-list-name">${renderNameWithSuffix(item.name)}</span>
                <span class="fish-list-badge fish-list-badge-${type}" aria-label="${badgeText}">${badgeIcon} ${badgeText}</span>
                <time class="fish-list-time" datetime="${escapeHtml(item.createdAt)}">${formatRegisteredTime(item.createdAt)}</time>
              </button>
              <div class="fish-list-actions">
                <button class="fish-action-button" type="button" data-toggle-fish-hidden="${item.id}" aria-label="${hideLabel}" title="${hideLabel}">
                  ${item.hidden ? '👁' : '🙈'}
                </button>
                <button class="fish-action-button fish-action-danger" type="button" data-delete-fish="${item.id}" title="${deleteLabel}" aria-label="${deleteLabel}">
                  🗑
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
  let fishCount = 0;
  let decoCount = 0;
  let totalCount = 0;
  for (const item of fishes) {
    if (item?.pendingDelete) continue;
    totalCount += 1;
    if (getPropType(item) === 'fish') fishCount += 1;
    else decoCount += 1;
  }

  return `
    <div class="prop-count-chips" aria-label="오브젝트 카운트">
      <span class="prop-count-chip prop-count-total">전체 ${totalCount}</span>
      <span class="prop-count-chip prop-count-fish ${fishCount === 0 ? 'is-empty' : ''}">🐟 ${fishCount}</span>
      <span class="prop-count-chip prop-count-deco ${decoCount === 0 ? 'is-empty' : ''}">🪨 ${decoCount}</span>
    </div>
  `;
}

export function renderAquariumStatus(aquarium, appState) {
  const visibleProps = aquarium.fishes.filter((item) => !item?.pendingDelete);
  const fishCount = visibleProps.filter((item) => getPropType(item) === 'fish').length;

  return `
    <aside class="aquarium-status" aria-labelledby="aquarium-title">
      <header class="aquarium-status-header">
        <h2 class="aquarium-status-title" id="aquarium-title">오브젝트 목록</h2>
        <span class="aquarium-status-count">${visibleProps.length}개</span>
      </header>

      <div class="aquarium-status-body">
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
