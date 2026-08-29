const API_URL = '/api/data';
const VERSION_KEY = 'expenses-app:d1-version:v1';

setupCloudflareUi();

export async function fetchGithubData(_settings, _token) {
  const response = await fetch(API_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (response.status === 404) {
    localStorage.removeItem(VERSION_KEY);
    throw new Error('Cloudflare D1 пока пуст. Если локальные данные актуальны, нажмите «Сохранить в D1».');
  }

  if (!response.ok) throw new Error(await apiError(response));

  const payload = await response.json();
  if (!payload || !payload.data || typeof payload.data !== 'object') {
    throw new Error('Cloudflare D1 вернул некорректные данные.');
  }

  rememberVersion(payload.version);
  return { sha: payload.version || null, data: payload.data };
}

export async function pushGithubData(_settings, _token, data, expectedSha) {
  const expectedVersion = expectedSha || localStorage.getItem(VERSION_KEY) || null;
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
  return { content: { sha: payload.version || null } };
}

function rememberVersion(version) {
  if (version) localStorage.setItem(VERSION_KEY, version);
  else localStorage.removeItem(VERSION_KEY);
}

async function apiError(response) {
  const body = await safeJson(response);
  if (response.status === 503 && body?.code === 'D1_API_DISABLED') {
    return 'Синхронизация D1 пока выключена. Сначала закройте сайт через Cloudflare Access, затем включите D1_API_ENABLED=1.';
  }
  if (response.status === 401 || response.status === 403) {
    return 'Нет доступа к Cloudflare D1. Проверьте авторизацию Cloudflare Access.';
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
      if (notice) notice.textContent = 'Локальная копия остается в браузере. Кнопки ниже синхронизируют полный JSON приложения с Cloudflare D1. Доступ к сайту и API должен быть закрыт Cloudflare Access.';
      if (legacyForm) legacyForm.hidden = true;
      if (conflictTitle) conflictTitle.textContent = 'Версия в Cloudflare D1 изменилась.';
    }

    const loadButton = document.getElementById('gh-load');
    const pushButton = document.getElementById('gh-push');
    if (loadButton) loadButton.textContent = 'Загрузить из D1';
    if (pushButton) pushButton.textContent = 'Сохранить в D1';

    for (const button of document.querySelectorAll('[data-action="github"]')) {
      const strong = button.querySelector('strong');
      const small = button.querySelector('small');
      const span = button.querySelector(':scope > span:not(.theme-value)');
      if (strong) strong.textContent = 'Cloudflare D1';
      if (small) small.textContent = 'Синхронизировать облачную копию';
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

function installLegacyTextObserver() {
  if (window.__financeD1TextObserverInstalled) return;
  window.__financeD1TextObserverInstalled = true;

  const replacements = new Map([
    ['Изменения сохранены в GitHub.', 'Изменения сохранены в Cloudflare D1.'],
    ['GitHub Sync завершен', 'Cloudflare D1 синхронизирован'],
    ['Данные загружены из GitHub', 'Данные загружены из Cloudflare D1'],
    ['Изменения объединены локально. Нажмите «Сохранить в GitHub» еще раз.', 'Изменения объединены локально. Нажмите «Сохранить в D1» еще раз.'],
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
