import { emptyData, migrateData } from './expenses.js';

const DATA_KEY = 'expenses-app:data:v1';
const BACKUP_KEY = 'expenses-app:pre-import-backup:v1';
const GITHUB_SETTINGS_KEY = 'expenses-app:github-settings:v1';
const THEME_KEY = 'expenses-app:theme';
const D1_VERSION_KEY = 'expenses-app:d1-version:v1';
const D1_DIRTY_KEY = 'expenses-app:d1-dirty:v1';
const D1_LAST_SYNCED_KEY = 'expenses-app:d1-last-synced:v1';
const D1_REMOTE_APPLY_KEY = 'expenses-app:d1-remote-apply:v1';
const D1_API_URL = '/api/data';
const AUTO_SYNC_DELAY_MS = 1200;
const AUTO_SYNC_RETRY_MS = 15000;
const REMOTE_CHECK_MIN_INTERVAL_MS = 5000;
const REMOTE_RELOAD_GUARD_KEY = 'expenses-app:d1-remote-reload:v1';

let autoSyncTimer = null;
let autoSyncInFlight = null;
let autoSyncQueued = false;
let remoteCheckInFlight = null;
let lastRemoteCheckAt = 0;
let listenersInstalled = false;

export async function loadInitialData() {
  installAutoSyncListeners();

  // После reload, вызванного новой D1-версией, следующий initial load уже
  // увидит одинаковые данные. Guard можно снять.
  sessionStorage.removeItem(REMOTE_RELOAD_GUARD_KEY);

  const local = readLocalData();
  const remote = await fetchD1Data();

  if (remote.ok) {
    const remoteData = migrateData(remote.payload.data);
    const remoteSerialized = JSON.stringify(remoteData);
    const remoteVersion = remote.payload.version || null;

    if (!local) {
      writeCloudSnapshot(remoteData, remoteSerialized, remoteVersion);
      return remoteData;
    }

    const localSerialized = JSON.stringify(local);
    const localVersion = localStorage.getItem(D1_VERSION_KEY);
    const dirty = localStorage.getItem(D1_DIRTY_KEY) === '1';

    // Если данные совпадают, просто освежаем версию D1 и считаем локальную копию синхронизированной.
    if (localSerialized === remoteSerialized) {
      rememberSyncedSnapshot(remoteSerialized, remoteVersion);
      return local;
    }

    // Локальная копия не менялась после последней синхронизации, а в D1 уже новая версия
    // (например, изменения сделаны с другого устройства) — при открытии берем D1.
    if (!dirty && localVersion && remoteVersion && localVersion !== remoteVersion) {
      backupData(local);
      writeCloudSnapshot(remoteData, remoteSerialized, remoteVersion);
      return remoteData;
    }

    // Это первый запуск новой логики автосинхронизации, а старый браузер не знает версию D1.
    // D1 уже является основной облачной копией: сохраняем локальную версию в backup и берем облако.
    if (!dirty && !localVersion) {
      backupData(local);
      writeCloudSnapshot(remoteData, remoteSerialized, remoteVersion);
      return remoteData;
    }

    // Есть локальные несинхронизированные изменения. Ничего молча не перезаписываем.
    // Если версия D1 не менялась, autosync сохранит их; иначе получим безопасный конфликт 409.
    // Это также покрывает переход со старой версии приложения, где dirty-флаг еще не существовал.
    localStorage.setItem(D1_DIRTY_KEY, '1');
    scheduleAutoSync();
    return local;
  }

  if (local) {
    if (localStorage.getItem(D1_DIRTY_KEY) === '1') scheduleAutoSync();
    return local;
  }

  return loadSeed();
}

// Историческое имя сохранено, потому что app.js уже импортирует loadSeed().
// Публичный data/expenses.json больше не нужен: сброс создает чистую локальную базу.
export async function loadSeed() {
  const data = migrateData(emptyData());
  localStorage.removeItem(D1_VERSION_KEY);
  localStorage.removeItem(D1_DIRTY_KEY);
  localStorage.removeItem(D1_LAST_SYNCED_KEY);
  saveData(data, { autoSync: false, markDirty: false });
  return data;
}

// Любое обычное сохранение приложения сначала мгновенно пишет localStorage,
// затем через небольшую задержку автоматически отправляет последнюю версию в D1.
export function saveData(data, options = {}) {
  const serialized = JSON.stringify(data);
  localStorage.setItem(DATA_KEY, serialized);

  const remoteMarker = sessionStorage.getItem(D1_REMOTE_APPLY_KEY);
  if (remoteMarker && remoteMarker === serialized) {
    sessionStorage.removeItem(D1_REMOTE_APPLY_KEY);
    rememberSyncedSnapshot(serialized, localStorage.getItem(D1_VERSION_KEY));
    return;
  }

  const markDirty = options.markDirty !== false;
  if (!markDirty) return;

  const lastSynced = localStorage.getItem(D1_LAST_SYNCED_KEY);
  if (lastSynced === serialized) {
    localStorage.removeItem(D1_DIRTY_KEY);
    return;
  }

  localStorage.setItem(D1_DIRTY_KEY, '1');
  if (options.autoSync !== false) scheduleAutoSync();
}

export function backupData(data) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify({ createdAt: new Date().toISOString(), data }));
}

export function getBackup() {
  const raw = localStorage.getItem(BACKUP_KEY);
  return raw ? JSON.parse(raw) : null;
}

// Можно вызвать вручную из консоли/будущего UI. Обычно это не требуется:
// saveData() сам запускает debounce-autosync.
export async function flushD1AutoSync() {
  clearTimeout(autoSyncTimer);
  autoSyncTimer = null;

  if (localStorage.getItem(D1_DIRTY_KEY) !== '1') return { ok: true, skipped: true };
  if (autoSyncInFlight) {
    autoSyncQueued = true;
    return autoSyncInFlight;
  }

  autoSyncInFlight = performAutoSync()
    .finally(() => {
      autoSyncInFlight = null;
      if (autoSyncQueued) {
        autoSyncQueued = false;
        scheduleAutoSync(100);
      }
    });

  return autoSyncInFlight;
}

async function performAutoSync() {
  const raw = localStorage.getItem(DATA_KEY);
  if (!raw) return { ok: true, skipped: true };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    emitSyncState('offline', 'Офлайн — изменения сохранятся в D1 после подключения к интернету.');
    return { ok: false, offline: true };
  }

  let data;
  try { data = migrateData(JSON.parse(raw)); }
  catch (error) {
    console.warn('Autosync skipped: local data invalid', error);
    return { ok: false, invalid: true };
  }

  emitSyncState('syncing', 'Сохраняем изменения в Cloudflare D1…');

  try {
    const expectedVersion = localStorage.getItem(D1_VERSION_KEY) || null;
    const response = await fetch(D1_API_URL, {
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
      const remoteSerialized = payload?.data && typeof payload.data === 'object'
        ? JSON.stringify(migrateData(payload.data))
        : null;
      const currentSerialized = JSON.stringify(data);

      // Иногда конфликт означает только устаревшую версию при тех же данных.
      // В таком случае достаточно принять новую версию D1 без повторной записи.
      if (remoteSerialized && remoteSerialized === currentSerialized) {
        rememberSyncedSnapshot(currentSerialized, payload?.version || null);
        emitSyncState('synced', 'Данные синхронизированы.');
        return { ok: true, version: payload?.version || null };
      }

      emitSyncState('conflict', 'В D1 есть более новая версия. Откройте «Cloudflare D1» и выберите загрузку или объединение.');
      return { ok: false, conflict: true, remote: payload };
    }

    if (!response.ok) {
      const body = await safeJson(response);
      const message = body?.message || body?.error || `Cloudflare D1 API: ${response.status}`;
      emitSyncState('error', `Автосинхронизация приостановлена: ${message}`);
      return { ok: false, status: response.status };
    }

    const payload = await response.json();
    rememberSyncedSnapshot(JSON.stringify(data), payload.version || null);
    emitSyncState('synced', 'Изменения автоматически сохранены в Cloudflare D1.');
    return { ok: true, version: payload.version || null };
  } catch (error) {
    console.warn('Cloudflare D1 autosync failed', error);
    emitSyncState('offline', 'Не удалось связаться с D1. Локальные изменения сохранены и будут отправлены позже.');
    scheduleAutoSync(AUTO_SYNC_RETRY_MS);
    return { ok: false, network: true };
  }
}

function scheduleAutoSync(delay = AUTO_SYNC_DELAY_MS) {
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => { void flushD1AutoSync(); }, delay);
}

// Проверяет, не появилась ли в D1 новая версия с другого устройства.
// Если локальная копия чистая — автоматически принимает облачную версию.
// Если локально есть несохранённые изменения — ничего не перезаписывает.
async function refreshFromD1({ force = false, reason = 'resume' } = {}) {
  if (typeof window === 'undefined') return { ok: true, skipped: true };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, offline: true };
  }

  const now = Date.now();
  if (!force && now - lastRemoteCheckAt < REMOTE_CHECK_MIN_INTERVAL_MS) {
    return { ok: true, throttled: true };
  }

  if (remoteCheckInFlight) return remoteCheckInFlight;

  lastRemoteCheckAt = now;
  remoteCheckInFlight = performRemoteCheck(reason)
    .finally(() => {
      remoteCheckInFlight = null;
    });

  return remoteCheckInFlight;
}

async function performRemoteCheck(reason) {
  const local = readLocalData();
  if (!local) return { ok: true, skipped: true };

  const remote = await fetchD1Data({ passive: true });
  if (!remote.ok) return remote;

  const remoteData = migrateData(remote.payload.data);
  const remoteSerialized = JSON.stringify(remoteData);
  const remoteVersion = remote.payload.version || null;

  const localSerialized = JSON.stringify(local);
  const localVersion = localStorage.getItem(D1_VERSION_KEY);
  const dirty = localStorage.getItem(D1_DIRTY_KEY) === '1';

  // Данные одинаковые: только обновляем служебную версию/снимок.
  if (remoteSerialized === localSerialized) {
    rememberSyncedSnapshot(localSerialized, remoteVersion);
    return { ok: true, same: true, version: remoteVersion };
  }

  // Есть локальные изменения. Никогда не затираем их автоматически.
  if (dirty) {
    if (localVersion && remoteVersion && localVersion !== remoteVersion) {
      emitSyncState(
        'conflict',
        'На другом устройстве есть более новая версия D1, а здесь есть локальные изменения. Автоматическое обновление остановлено.'
      );
      return { ok: false, conflict: true, remote: remote.payload };
    }

    // Облако не менялось — можно спокойно отправить локальные изменения.
    scheduleAutoSync(150);
    return { ok: true, localDirty: true };
  }

  // Локальная копия чистая, а D1 отличается — облако считаем актуальным.
  // Сохраняем backup перед заменой.
  backupData(local);
  writeCloudSnapshot(remoteData, remoteSerialized, remoteVersion);

  emitSyncState(
    'updated',
    reason === 'online'
      ? 'После восстановления сети загружена новая версия из D1.'
      : 'На другом устройстве найдена новая версия. Данные обновлены из D1.'
  );

  // app.js держит рабочий объект data в памяти. Чтобы не менять всю архитектуру
  // приложения и гарантированно перерисовать ВСЕ модули (аналитику, приманку,
  // месяцы, капитал), после принятия новой D1-копии делаем один безопасный reload.
  // Guard нужен только против теоретической петли перезагрузки.
  const guardValue = `${remoteVersion || ''}:${remoteSerialized.length}`;
  const previousGuard = sessionStorage.getItem(REMOTE_RELOAD_GUARD_KEY);
  if (previousGuard !== guardValue) {
    sessionStorage.setItem(REMOTE_RELOAD_GUARD_KEY, guardValue);
    setTimeout(() => window.location.reload(), 60);
  }

  return { ok: true, updated: true, version: remoteVersion };
}

async function fetchD1Data(options = {}) {
  try {
    const response = await fetch(D1_API_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (response.ok) {
      const payload = await response.json();
      if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        return { ok: true, payload };
      }
      console.warn('Cloudflare D1 returned invalid initial payload');
      return { ok: false, status: 500 };
    }

    // Пустая база: при начальной загрузке локальные данные станут первой D1-копией.
    // При пассивной фоновой проверке ничего не меняем.
    if (response.status === 404) {
      if (!options.passive) {
        localStorage.removeItem(D1_VERSION_KEY);
        if (localStorage.getItem(DATA_KEY)) {
          localStorage.setItem(D1_DIRTY_KEY, '1');
          scheduleAutoSync();
        }
      }
      return { ok: false, empty: true, status: 404 };
    }

    if (![401, 403, 503].includes(response.status)) {
      console.warn(`Cloudflare D1 initial load failed: ${response.status}`);
    }
    return { ok: false, status: response.status };
  } catch (error) {
    console.warn('Cloudflare D1 unavailable, using local data', error);
    return { ok: false, network: true };
  }
}

function readLocalData() {
  const local = localStorage.getItem(DATA_KEY);
  if (!local) return null;
  try { return migrateData(JSON.parse(local)); }
  catch (error) {
    console.warn('Local data invalid', error);
    return null;
  }
}

function writeCloudSnapshot(data, serialized, version) {
  localStorage.setItem(DATA_KEY, serialized);
  rememberSyncedSnapshot(serialized, version);
}

function rememberSyncedSnapshot(serialized, version) {
  if (version) localStorage.setItem(D1_VERSION_KEY, version);
  else localStorage.removeItem(D1_VERSION_KEY);
  localStorage.setItem(D1_LAST_SYNCED_KEY, serialized);
  localStorage.removeItem(D1_DIRTY_KEY);
}

function installAutoSyncListeners() {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;

  window.addEventListener('online', () => {
    if (localStorage.getItem(D1_DIRTY_KEY) === '1') {
      scheduleAutoSync(200);
    } else {
      void refreshFromD1({ force: true, reason: 'online' });
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;

    if (localStorage.getItem(D1_DIRTY_KEY) === '1') {
      scheduleAutoSync(250);
    }

    void refreshFromD1({ reason: 'visibility' });
  });

  window.addEventListener('focus', () => {
    void refreshFromD1({ reason: 'focus' });
  });

  window.addEventListener('pageshow', () => {
    void refreshFromD1({ reason: 'pageshow' });
  });
}

function emitSyncState(state, message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('finance:d1-sync-state', {
    detail: { state, message, at: new Date().toISOString() },
  }));
}

async function safeJson(response) {
  try { return await response.json(); } catch { return null; }
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
