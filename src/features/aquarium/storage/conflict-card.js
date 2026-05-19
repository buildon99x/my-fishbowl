/**
 * conflict-card.js — parent-zone conflict resolution card.
 *
 * Generates an HTML string showing two aquarium previews (fish count and
 * name) with two decision buttons: "overwrite" and "abandon".
 *
 * NOTE: The "merge" button is intentionally NOT rendered here.
 * It will be added after S-025d (OAuth / account merge) is implemented.
 *
 * This card is mounted ONLY in the parent zone. The child zone never sees it.
 */

/**
 * Renders a minimal aquarium preview card (name + fish count).
 *
 * @param {object|null} aquarium
 * @param {string} label - e.g. "이 태블릿" or "다른 기기"
 * @returns {string} HTML fragment
 */
function renderAquariumPreview(aquarium, label) {
  const name = aquarium?.name ?? '어항';
  const fishCount = Array.isArray(aquarium?.fishes) ? aquarium.fishes.length : 0;

  return `
    <div class="conflict-preview" aria-label="${label} 어항 미리보기">
      <p class="conflict-preview__label">${label}</p>
      <div class="conflict-preview__bowl" aria-hidden="true">
        <!-- Fish count indicator (visual only — no text for children) -->
        <span class="conflict-preview__fish-count" aria-hidden="true">🐟 × ${fishCount}</span>
      </div>
      <p class="conflict-preview__name">${name}</p>
      <p class="conflict-preview__count">${fishCount}마리</p>
    </div>
  `;
}

/**
 * Returns an HTML string for the parent-zone conflict resolution card.
 *
 * The card shows two aquarium previews and two decision buttons.
 * Button minimum hit target is 48 × 48 CSS px (enforced via inline min-height/min-width).
 *
 * Timestamps and ETag values are NOT shown to the user.
 *
 * @param {{ localAquarium: object|null, serverAquarium: object|null, sourceEtag: string|null }} conflictState
 * @returns {string} HTML string
 */
export function renderConflictCard(conflictState) {
  if (!conflictState) return '';

  const { localAquarium, serverAquarium } = conflictState;

  return `
    <div class="conflict-card" role="dialog" aria-labelledby="conflict-card-title" aria-modal="true">
      <h2 id="conflict-card-title" class="conflict-card__title">어항 충돌</h2>
      <p class="conflict-card__description">
        두 기기에서 같은 어항이 변경됐어요. 어느 버전을 사용할지 선택해 주세요.
      </p>

      <div class="conflict-card__previews">
        ${renderAquariumPreview(localAquarium, '이 태블릿')}
        ${renderAquariumPreview(serverAquarium, '다른 기기 (서버)')}
      </div>

      <div class="conflict-card__actions">
        <!-- overwrite: push local version to server -->
        <button
          class="conflict-card__btn conflict-card__btn--overwrite"
          data-action="overwrite"
          style="min-width: 48px; min-height: 48px;"
          type="button"
        >
          이 태블릿 버전으로 덮어쓰기
        </button>

        <!-- abandon: pull server version to local -->
        <button
          class="conflict-card__btn conflict-card__btn--abandon"
          data-action="abandon"
          style="min-width: 48px; min-height: 48px;"
          type="button"
        >
          서버 버전 받기
        </button>

        <!-- merge button: NOT rendered until S-025d -->
      </div>
    </div>
  `;
}
