import { emptyData, migrateData } from './expenses.js';

const DATA_KEY = 'expenses-app:data:v1';
const BACKUP_KEY = 'expenses-app:pre-import-backup:v1';
const GITHUB_SETTINGS_KEY = 'expenses-app:github-settings:v1';
const THEME_KEY = 'expenses-app:theme';
const D1_VERSION_KEY = 'expenses-app:d1-version:v1';
const D1_API_URL = '/api/data';

export async function loadInitialData() {
  const local = localStorage.getItem(DATA_KEY);
  if (local) {
    try { return migrateData(JSON.parse(local)); } catch (error) { console.warn('Local data invalid', error); }
  }

  // На новом устройстве пробуем получить облачную копию. При недоступной сети,
  // выключенном API или пустой D1 приложение все равно запускается офлайн.
  try {
    const response = await fetch(D1_API_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (response.ok) {
      const payload = await response.json();
      const data = migrateData(payload.data);
      saveData(data);
      if (payload.version) localStorage.setItem(D1_VERSION_KEY, payload.version);
      return data;
    }

    if (![401, 403, 404, 503].includes(response.status)) {
      console.warn(`Cloudflare D1 initial load failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('Cloudflare D1 unavailable, starting with local empty data', error);
  }

  return loadSeed();
}

// Историческое имя сохранено, потому что app.js уже импортирует loadSeed().
// Публичный data/expenses.json больше не нужен: сброс создает чистую локальную базу.
export async function loadSeed() {
  const data = migrateData(emptyData());
  localStorage.removeItem(D1_VERSION_KEY);
  saveData(data);
  return data;
}

export function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function backupData(data) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify({ createdAt: new Date().toISOString(), data }));
}

export function getBackup() {
  const raw = localStorage.getItem(BACKUP_KEY);
  return raw ? JSON.parse(raw) : null;
}

// Оставлены для совместимости с текущим app.js. GitHub API больше не используется.
export function getGithubSettings() {
  try { return JSON.parse(localStorage.getItem(GITHUB_SETTINGS_KEY)) || {}; } catch { return {}; }
}

export function saveGithubSettings(settings) {
  localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(settings));
}

export function getTheme() { return localStorage.getItem(THEME_KEY) || 'auto'; }
export function setTheme(theme) { localStorage.setItem(THEME_KEY, theme); }
