const API_URL = '/api/data';
const VERSION_KEY = 'expenses-app:d1-version:v1';
const DIRTY_KEY = 'expenses-app:d1-dirty:v1';
const LAST_SYNCED_KEY = 'expenses-app:d1-last-synced:v1';
const REMOTE_APPLY_KEY = 'expenses-app:d1-remote-apply:v1';

setupCloudflareUi();
setupAutoSyncStatus();

export async function fetchGithubData(_settings, _token) {
  const response = await fetch(API_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (response.status === 404) {
    localStorage.removeItem(VERSION_KEY);
    throw new Error('Cloudflare D1 пока пуст. Локальные изменения сохранятся туда автоматически.');
  }

  if (!response.ok) throw new Error(await apiError(response));

  const payload = await response.json();
  if (!payload || !payload.data || typeof payload.data !== 'object') {
    throw new Error('Cloudflare D1 вернул некорректные данные.');
  }

  rememberVersion(payload.version);
  const remoteSerialized = JSON.stringify(payload.data);
  localStorage.setItem(LAST_SYNCED_KEY, remoteSerialized);
  localStorage.removeItem(DIRTY_KEY);
  // app.js после fetchGithubData() вызывает saveData(). Маркер сообщает storage.js,
  // что это применение облачной версии, а не новое локальное изменение.
  sessionStorage.setItem(REMOTE_APPLY_KEY, remoteSerialized);
  return { sha: payload.version || null, data: payload.data };
}

export async function pushGithubData(_settings, _token, data, expectedSha) {
  const storedVersion = localStorage.getItem(VERSION_KEY) || null;
  const dirty = localStorage.getItem(DIRTY_KEY) === '1';
  // После успешного autosync app.js может помнить старый lastGithubSha — тогда берем
  // свежую локально сохраненную версию. При ручном разрешении конфликта наоборот
  // expectedSha содержит версию удаленной копии, с которой пользователь объединял данные.
  const expectedVersion = dirty
    ? (expectedSha || storedVersion)
    : (storedVersion || expectedSha || null);
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    credentials: 'same-origin',
    body: JSON.stringify({ data, expectedVersion }),
  });

  if (response.status === 409) {
    const payload = await safeJson(response);
    const error = new Error('Данные в Cloudflare D1 изменились после последней загрузки. Загрузите свежую версию или выполните объединение.');
    error.code = 'SHA_CONFLICT';
    error.remote = {
      sha: payload?.version || null,
      data: payload?.data,
    };
    throw error;
  }

  if (!response.ok) throw new Error(await apiError(response));

  const payload = await response.json();
  rememberVersion(payload.version);
  localStorage.setItem(LAST_SYNCED_KEY, JSON.stringify(data));
  localStorage.removeItem(DIRTY_KEY);
  return { content: { sha: payload.version || null } };
}

function rememberVersion(version) {
  if (version) localStorage.setItem(VERSION_KEY, version);
  else localStorage.removeItem(VERSION_KEY);
}

async function apiError(response) {
  const body = await safeJson(response);
  if (response.status === 503 && body?.code === 'D1_API_DISABLED') {
    return 'Синхронизация D1 выключена. Проверьте переменную D1_API_ENABLED=1 в Cloudflare Pages.';
  }
  if (response.status === 401 || response.status === 403) {
    return 'Сессия доступа истекла. Обновите страницу и снова войдите в приложение.';
  }
  return body?.message || body?.error || `Cloudflare D1 API: ${response.status} ${response.statusText}`;
}

async function safeJson(response) {
  try { return await response.json(); } catch { return null; }
}

function setupCloudflareUi() {
  // Удаляем старые GitHub PAT из браузера: синхронизация больше не использует GitHub API.
  localStorage.removeItem('expenses-app:gh-token:persistent');
  sessionStorage.removeItem('expenses-app:gh-token');

  const apply = () => {
    const dialog = document.getElementById('github-dialog');
    if (dialog) {
      const kicker = dialog.querySelector('.dialog-kicker');
      const title = dialog.querySelector('h2');
      const notice = dialog.querySelector('.notice');
      const legacyForm = dialog.querySelector('.form-grid');
      const conflictTitle = dialog.querySelector('#gh-conflict strong');
      if (kicker) kicker.textContent = 'Облачная копия';
      if (title) title.textContent = 'Cloudflare D1';
      if (notice) notice.textContent = 'Изменения сохраняются локально сразу и автоматически отправляются в D1 примерно через секунду. При открытии приложения облачная версия также проверяется автоматически. Кнопки ниже оставлены для ручной синхронизации и разрешения конфликтов.';
      if (legacyForm) legacyForm.hidden = true;
      if (conflictTitle) conflictTitle.textContent = 'Версия в Cloudflare D1 изменилась.';
    }

    const loadButton = document.getElementById('gh-load');
    const pushButton = document.getElementById('gh-push');
    if (loadButton) loadButton.textContent = 'Загрузить из D1';
    if (pushButton) pushButton.textContent = 'Сохранить сейчас';

    for (const button of document.querySelectorAll('[data-action="github"]')) {
      const strong = button.querySelector('strong');
      const small = button.querySelector('small');
      const span = button.querySelector(':scope > span:not(.theme-value)');
      if (strong) strong.textContent = 'Cloudflare D1';
      if (small) small.textContent = 'Автосинхронизация включена';
      if (!strong && span) span.textContent = 'Синхронизация';
    }

    // Seed JSON больше не публикуется. Локальную очистку оставляем через импорт/экспорт JSON,
    // поэтому старую кнопку сброса к публичному seed скрываем.
    for (const button of document.querySelectorAll('[data-action="reset-seed"]')) button.hidden = true;

    installLegacyTextObserver();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
}

function setupAutoSyncStatus() {
  if (typeof window === 'undefined' || window.__financeD1SyncStatusInstalled) return;
  window.__financeD1SyncStatusInstalled = true;

  window.addEventListener('finance:d1-sync-state', (event) => {
    const detail = event.detail || {};
    const status = document.getElementById('gh-status');
    if (status && detail.message) status.textContent = detail.message;

    for (const button of document.querySelectorAll('[data-action="github"]')) {
      const small = button.querySelector('small');
      if (!small) continue;
      if (detail.state === 'syncing') small.textContent = 'Сохраняем в D1…';
      else if (detail.state === 'synced') small.textContent = 'Автосинхронизация включена';
      else if (detail.state === 'offline') small.textContent = 'Офлайн · изменения сохранены локально';
      else if (detail.state === 'conflict') small.textContent = 'Нужна проверка конфликта';
      else if (detail.state === 'error') small.textContent = 'Синхронизация приостановлена';
    }
  });
}

function installLegacyTextObserver() {
  if (window.__financeD1TextObserverInstalled) return;
  window.__financeD1TextObserverInstalled = true;

  const replacements = new Map([
    ['Изменения сохранены в GitHub.', 'Изменения сохранены в Cloudflare D1.'],
    ['GitHub Sync завершен', 'Cloudflare D1 синхронизирован'],
    ['Данные загружены из GitHub', 'Данные загружены из Cloudflare D1'],
    ['Изменения объединены локально. Нажмите «Сохранить в GitHub» еще раз.', 'Изменения объединены локально. Нажмите «Сохранить сейчас» еще раз.'],
  ]);

  const normalize = (element) => {
    if (!element) return;
    const replacement = replacements.get(element.textContent);
    if (replacement && element.textContent !== replacement) element.textContent = replacement;
  };

  const status = document.getElementById('gh-status');
  const toast = document.getElementById('toast');
  normalize(status);
  normalize(toast);

  const observer = new MutationObserver(() => {
    normalize(status);
    normalize(toast);
  });
  if (status) observer.observe(status, { childList: true, characterData: true, subtree: true });
  if (toast) observer.observe(toast, { childList: true, characterData: true, subtree: true });
}
