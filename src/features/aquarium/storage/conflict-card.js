import { escapeHtml } from '../../../lib/utils.js';

// Parent-area conflict card shown when a 412 conflict is detected during sync.
// Offers two resolutions: overwrite the server copy, or abandon the local copy.
export function renderConflictCard({ lastSyncedAt } = {}) {
  const when = lastSyncedAt
    ? `<p class="conflict-card-meta">마지막 동기화: ${escapeHtml(lastSyncedAt)}</p>`
    : '';

  return `
    <div class="conflict-card" role="alertdialog" aria-live="assertive" data-conflict-card>
      <h2 class="conflict-card-title">동기화 충돌이 발생했어요</h2>
      <p class="conflict-card-body">
        다른 기기에서 어항이 변경되었습니다. 이 기기의 변경 사항을 어떻게 처리할까요?
      </p>
      ${when}
      <div class="conflict-card-actions">
        <button type="button" class="conflict-card-btn is-overwrite" data-conflict-overwrite>
          이 기기 내용으로 덮어쓰기
        </button>
        <button type="button" class="conflict-card-btn is-abandon" data-conflict-abandon>
          이 기기 변경 사항 버리기
        </button>
      </div>
    </div>
  `;
}

// Wires the card buttons to caller-provided resolution handlers.
export function bindConflictCard(root, { onOverwrite, onAbandon } = {}) {
  if (!root) return;

  const overwriteBtn = root.querySelector('[data-conflict-overwrite]');
  const abandonBtn = root.querySelector('[data-conflict-abandon]');

  overwriteBtn?.addEventListener('click', () => {
    onOverwrite?.();
  });

  abandonBtn?.addEventListener('click', () => {
    onAbandon?.();
  });
}
