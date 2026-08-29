const CREDENTIAL_KEY = 'expenses-app:device-lock-credential:v1';
const USER_KEY = 'expenses-app:device-lock-user:v1';
const HIDDEN_AT_KEY = 'expenses-app:device-lock-hidden-at:v1';
// Короткое переключение в другое приложение не требует повторной биометрии.
// После 2 минут в фоне приложение снова потребует Face ID / Windows Hello.
const LOCK_AFTER_HIDDEN_MS = 2 * 60 * 1000;

// Экран-приманка: при каждом запуске реальные финансовые данные скрыты.
// В качестве шаблона используется июль 2026 из исходного отчёта.
const DECOY_INCOME = 150000;
const DECOY_INCOME_NOTE = 'инв - только купоны и доход по вкладам, зп - работа + доп работа';
const DECOY_EXPENSES = [
  {
    "day": 1,
    "category": "ЖКХ",
    "description": "За квартиру",
    "amount": 25000.0,
    "type": "Семейный"
  },
  {
    "day": 1,
    "category": "Еда",
    "description": "На альфу Насте",
    "amount": 6000.0,
    "type": "Семейный"
  },
  {
    "day": 1,
    "category": "Еда",
    "description": "Дом",
    "amount": 260.0,
    "type": "Семейный"
  },
  {
    "day": 2,
    "category": "Еда",
    "description": "На альфу Насте",
    "amount": 1000.0,
    "type": "Семейный"
  },
  {
    "day": 2,
    "category": "Здоровье",
    "description": "Зал",
    "amount": 1600.0,
    "type": "Семейный"
  },
  {
    "day": 2,
    "category": "Бытовуха",
    "description": "Озон",
    "amount": 167.0,
    "type": "Семейный"
  },
  {
    "day": 3,
    "category": "Еда",
    "description": "На альфу Насте",
    "amount": 5000.0,
    "type": "Семейный"
  },
  {
    "day": 3,
    "category": "Подписки",
    "description": "Ростелеком",
    "amount": 1060.0,
    "type": "Семейный"
  },
  {
    "day": 3,
    "category": "Подписки",
    "description": "Т Про",
    "amount": 299.0,
    "type": "Личный"
  },
  {
    "day": 4,
    "category": "Одежда",
    "description": "Кросы и штаны",
    "amount": 1200.0,
    "type": "Личный"
  },
  {
    "day": 4,
    "category": "Одежда",
    "description": "Джинсы Насте",
    "amount": 1500.0,
    "type": "Жена"
  },
  {
    "day": 4,
    "category": "Здоровье",
    "description": "Анализы",
    "amount": 2500.0,
    "type": "Личный"
  },
  {
    "day": 4,
    "category": "Такси",
    "description": "ПО Ижу",
    "amount": 180.0,
    "type": "Семейный"
  },
  {
    "day": 4,
    "category": "Еда",
    "description": "Дядя Арчи",
    "amount": 696.0,
    "type": "Семейный"
  },
  {
    "day": 5,
    "category": "Здоровье",
    "description": "Зубы Насте",
    "amount": 6500.0,
    "type": "Жена"
  },
  {
    "day": 5,
    "category": "Подписки",
    "description": "Чат гпт",
    "amount": 1800.0,
    "type": "Семейный"
  },
  {
    "day": 8,
    "category": "Здоровье",
    "description": "Зал",
    "amount": 15000.0,
    "type": "Жена"
  },
  {
    "day": 10,
    "category": "Еда",
    "description": "На альфу Насте",
    "amount": 2000.0,
    "type": "Семейный"
  },
  {
    "day": 13,
    "category": "Учеба",
    "description": "Техновек",
    "amount": 10000.0,
    "type": "Личный"
  },
  {
    "day": 14,
    "category": "Прочее",
    "description": "Насте",
    "amount": 1300.0,
    "type": "Жена"
  },
  {
    "day": 14,
    "category": "Еда",
    "description": "На альфу Насте",
    "amount": 2000.0,
    "type": "Семейный"
  },
  {
    "day": 16,
    "category": "Еда",
    "description": "На альфу Насте",
    "amount": 2000.0,
    "type": "Семейный"
  },
  {
    "day": 17,
    "category": "Подписки",
    "description": "Yota",
    "amount": 762.0,
    "type": "Личный"
  },
  {
    "day": 18,
    "category": "Такси",
    "description": "Втк",
    "amount": 400.0,
    "type": "Семейный"
  },
  {
    "day": 18,
    "category": "Такси",
    "description": "Иж",
    "amount": 400.0,
    "type": "Семейный"
  },
  {
    "day": 18,
    "category": "Прочее",
    "description": "Профи",
    "amount": 120.0,
    "type": "Семейный"
  },
  {
    "day": 19,
    "category": "Еда",
    "description": "Завтрак",
    "amount": 536.0,
    "type": "Семейный"
  },
  {
    "day": 19,
    "category": "Одежда",
    "description": "Носки",
    "amount": 263.0,
    "type": "Личный"
  },
  {
    "day": 22,
    "category": "Еда",
    "description": "На альфу Насте",
    "amount": 2000.0,
    "type": "Семейный"
  },
  {
    "day": 23,
    "category": "Еда",
    "description": "Вода",
    "amount": 66.0,
    "type": "Семейный"
  },
  {
    "day": 25,
    "category": "Такси",
    "description": "Втк",
    "amount": 536.0,
    "type": "Семейный"
  },
  {
    "day": 25,
    "category": "Такси",
    "description": "Шаркан",
    "amount": 499.0,
    "type": "Семейный"
  },
  {
    "day": 25,
    "category": "Еда",
    "description": "Дом",
    "amount": 2063.0,
    "type": "Семейный"
  },
  {
    "day": 26,
    "category": "Такси",
    "description": "Иж",
    "amount": 500.0,
    "type": "Семейный"
  },
  {
    "day": 27,
    "category": "Одежда",
    "description": "Кепка",
    "amount": 227.0,
    "type": "Личный"
  },
  {
    "day": 27,
    "category": "Здоровье",
    "description": "Зал",
    "amount": 2000.0,
    "type": "Личный"
  },
  {
    "day": 28,
    "category": "Еда",
    "description": "Вода",
    "amount": 99.0,
    "type": "Семейный"
  },
  {
    "day": 29,
    "category": "Еда",
    "description": "Дом",
    "amount": 150.0,
    "type": "Семейный"
  },
  {
    "day": 29,
    "category": "Еда",
    "description": "Суши",
    "amount": 1000.0,
    "type": "Семейный"
  },
  {
    "day": 30,
    "category": "Еда",
    "description": "На альфу Насте",
    "amount": 1000.0,
    "type": "Семейный"
  },
  {
    "day": 30,
    "category": "Развлечение",
    "description": "Кофе",
    "amount": 195.0,
    "type": "Семейный"
  },
  {
    "day": 31,
    "category": "Еда",
    "description": "Дом",
    "amount": 318.0,
    "type": "Семейный"
  }
];
const DECOY_MONTH_ABBRS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];


let overlay;
let title;
let hint;
let primaryButton;
let secondaryButton;
let busy = false;
let unlocked = false;
let supported = false;
let credentialId = localStorage.getItem(CREDENTIAL_KEY) || '';

let decoyActive = true;
let decoyWorkspace = null;
let realWorkspace = null;
let decoyToggle = null;
let headerSubtitle = null;
let realHeaderSubtitle = '';
let subtitleObserver = null;
let titleObserver = null;
let decoyWriteGuard = false;

start().catch((error) => {
  console.error('Biometric lock setup failed', error);
  releaseLock();
});

async function start() {
  installStyles();
  createOverlay();
  setupPrivacyDecoy();
  lockNow();

  supported = await biometricAvailable();
  if (!supported) {
    releaseLock();
    return;
  }

  if (!credentialId) {
    showEnrollment();
  } else {
    showUnlock();
    // Пробуем вызвать системную проверку сразу. Safari/iOS иногда требует
    // пользовательский жест — в таком случае останется кнопка «Разблокировать».
    queueMicrotask(() => unlockWithBiometrics({ silentFailure: true }));
  }

  document.addEventListener('visibilitychange', handleVisibilityChange, true);
  window.addEventListener('pagehide', rememberHidden, true);
  window.addEventListener('pageshow', handlePageShow, true);
}

async function biometricAvailable() {
  if (!window.PublicKeyCredential || !navigator.credentials?.create || !navigator.credentials?.get) return false;
  if (!window.isSecureContext) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function installStyles() {
  if (document.getElementById('finance-device-lock-style')) return;
  const style = document.createElement('style');
  style.id = 'finance-device-lock-style';
  style.textContent = `
    html.finance-device-locked body > :not(#finance-device-lock) {
      visibility: hidden !important;
    }
    #finance-device-lock {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
      background: #f4f3ef;
      color: #1d1f1b;
      visibility: visible !important;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #finance-device-lock[hidden] { display: none !important; }
    .finance-device-lock-card {
      width: min(100%, 390px);
      display: grid;
      gap: 14px;
      text-align: center;
    }
    .finance-device-lock-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 4px;
      display: grid;
      place-items: center;
      border-radius: 22px;
      background: #1d1f1b;
      color: #fff;
      font-size: 29px;
      line-height: 1;
      box-shadow: 0 14px 34px rgba(29,31,27,.16);
    }
    .finance-device-lock-card h1 {
      margin: 0;
      font-size: 25px;
      line-height: 1.15;
      letter-spacing: -.02em;
    }
    .finance-device-lock-card p {
      margin: 0 auto 8px;
      max-width: 330px;
      color: #686b65;
      font-size: 14px;
      line-height: 1.5;
    }
    .finance-device-lock-button {
      width: 100%;
      min-height: 50px;
      border: 0;
      border-radius: 14px;
      padding: 0 18px;
      background: #1d1f1b;
      color: #fff;
      font: inherit;
      font-weight: 750;
      cursor: pointer;
    }
    .finance-device-lock-button:disabled { opacity: .55; cursor: wait; }
    .finance-device-lock-secondary {
      border: 0;
      background: transparent;
      color: #686b65;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      padding: 8px;
    }
    /* Safari/iOS: native <select> can ignore min-height and render
       shorter than neighboring inputs. Keep expense fields equal. */
    @media (max-width: 700px) {
      .expense-form-grid #expense-category,
      .expense-form-grid #expense-type {
        height: 46px !important;
        min-height: 46px !important;
        max-height: 46px !important;
      }
      .expense-form-grid #expense-type {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }
    }
    @media (prefers-color-scheme: dark) {
      #finance-device-lock { background: #151613; color: #f4f3ef; }
      .finance-device-lock-icon { background: #f4f3ef; color: #151613; box-shadow: none; }
      .finance-device-lock-card p, .finance-device-lock-secondary { color: #a5a79f; }
      .finance-device-lock-button { background: #f4f3ef; color: #151613; }
    }
  `;
  document.head.append(style);
}

function createOverlay() {
  if (document.getElementById('finance-device-lock')) return;
  overlay = document.createElement('section');
  overlay.id = 'finance-device-lock';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="finance-device-lock-card">
      <div class="finance-device-lock-icon" aria-hidden="true">◉</div>
      <h1></h1>
      <p></p>
      <button class="finance-device-lock-button" type="button"></button>
      <button class="finance-device-lock-secondary" type="button" hidden>Использовать пароль</button>
    </div>
  `;
  document.body.append(overlay);
  title = overlay.querySelector('h1');
  hint = overlay.querySelector('p');
  primaryButton = overlay.querySelector('.finance-device-lock-button');
  secondaryButton = overlay.querySelector('.finance-device-lock-secondary');
  primaryButton.addEventListener('click', handlePrimaryClick);
  secondaryButton.addEventListener('click', usePasswordFallback);
}

function deviceLabel() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Face ID';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Touch ID';
  if (/Android/i.test(ua)) return 'биометрию';
  return 'биометрию устройства';
}

function showEnrollment(message = '') {
  lockNow();
  title.textContent = `Настроить ${deviceLabel()}`;
  hint.textContent = message || `На этом устройстве биометрическая блокировка ещё не настроена. После настройки приложение будет запрашивать ${deviceLabel()} при каждом открытии.`;
  primaryButton.textContent = `Включить ${deviceLabel()}`;
  primaryButton.dataset.mode = 'enroll';
  secondaryButton.hidden = true;
}

function showUnlock(message = '') {
  // Шаблонные данные включаем только тогда, когда реально требуется
  // повторная авторизация через Face ID / Windows Hello.
  activateDecoy({ closeTransient: true });
  lockNow();
  title.textContent = 'Приложение заблокировано';
  hint.textContent = message || `Подтвердите вход через ${deviceLabel()}.`;
  primaryButton.textContent = `Разблокировать · ${deviceLabel()}`;
  primaryButton.dataset.mode = 'unlock';
  secondaryButton.hidden = false;
}

async function handlePrimaryClick() {
  if (busy) return;
  if (primaryButton.dataset.mode === 'enroll') await enrollBiometrics();
  else await unlockWithBiometrics({ silentFailure: false });
}

async function enrollBiometrics() {
  setBusy(true, 'Настройка…');
  try {
    const userId = getOrCreateUserId();
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: 'Расходы' },
        user: {
          id: base64UrlToBytes(userId),
          name: 'finance-report-local',
          displayName: 'Расходы',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    if (!credential?.rawId) throw new Error('Не удалось создать ключ устройства.');
    credentialId = bytesToBase64Url(new Uint8Array(credential.rawId));
    localStorage.setItem(CREDENTIAL_KEY, credentialId);
    releaseLock();
  } catch (error) {
    if (isUserCancel(error)) {
      showEnrollment('Настройка отменена. Для работы биометрической блокировки подтвердите действие ещё раз.');
    } else {
      console.error('Biometric enrollment failed', error);
      showEnrollment('Не удалось настроить биометрию на этом устройстве. Попробуйте ещё раз.');
    }
  } finally {
    setBusy(false);
  }
}

async function unlockWithBiometrics({ silentFailure }) {
  if (busy || !credentialId || document.hidden) return;
  setBusy(true, 'Проверка…');
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{
          type: 'public-key',
          id: base64UrlToBytes(credentialId),
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!credential?.rawId) throw new Error('Устройство не вернуло подтверждение.');
    const returnedId = bytesToBase64Url(new Uint8Array(credential.rawId));
    if (returnedId !== credentialId) throw new Error('Получен другой ключ устройства.');
    if (!hasUserVerification(credential.response?.authenticatorData)) {
      throw new Error('Биометрическая проверка не подтверждена.');
    }
    releaseLock();
  } catch (error) {
    if (!silentFailure && !isUserCancel(error)) console.error('Biometric unlock failed', error);
    showUnlock(silentFailure
      ? `Нажмите кнопку и подтвердите вход через ${deviceLabel()}.`
      : `Не удалось разблокировать. Повторите проверку через ${deviceLabel()}.`);
  } finally {
    setBusy(false);
  }
}

function hasUserVerification(authenticatorData) {
  if (!authenticatorData) return false;
  const bytes = new Uint8Array(authenticatorData);
  // authenticatorData: 32 bytes rpIdHash, затем byte flags. UV = bit 2 (0x04).
  return bytes.length > 32 && (bytes[32] & 0x04) === 0x04;
}

function handleVisibilityChange() {
  if (!supported || !credentialId) return;
  if (document.hidden) {
    // Сразу закрываем содержимое, чтобы финансовые данные не попадали
    // в снимок приложения в переключателе iOS/Windows.
    rememberHidden();
    return;
  }

  restoreAfterBackground();
}

function rememberHidden() {
  // При обычном сворачивании/переключении приложения шаблон не включаем.
  // Если пользователь вернётся в пределах grace period, он продолжит работу
  // с тем же экраном и тем же режимом отображения данных.
  if (!supported || !credentialId) return;
  sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
  if (!busy) lockNow();
}

function restoreAfterBackground() {
  const hiddenAt = Number(sessionStorage.getItem(HIDDEN_AT_KEY) || 0);
  if (!hiddenAt) return;

  const hiddenFor = Date.now() - hiddenAt;
  if (hiddenFor >= LOCK_AFTER_HIDDEN_MS) {
    showUnlock();
    unlockWithBiometrics({ silentFailure: true });
    return;
  }

  // Вернулись быстро (например, посмотрели операцию в банковском приложении):
  // снимаем защитный экран без повторного Face ID / Windows Hello.
  releaseLock();
}

function handlePageShow(event) {
  if (!supported || !credentialId || !event.persisted) return;
  restoreAfterBackground();
}

function lockNow() {
  unlocked = false;
  document.documentElement.classList.add('finance-device-locked');
  if (overlay) overlay.hidden = false;
}

function releaseLock() {
  unlocked = true;
  sessionStorage.removeItem(HIDDEN_AT_KEY);
  document.documentElement.classList.remove('finance-device-locked');
  if (overlay) overlay.hidden = true;
}

function setBusy(value, text = '') {
  busy = value;
  if (!primaryButton) return;
  primaryButton.disabled = value;
  if (value && text) primaryButton.textContent = text;
  else if (!unlocked) {
    if (credentialId) primaryButton.textContent = `Разблокировать · ${deviceLabel()}`;
    else primaryButton.textContent = `Включить ${deviceLabel()}`;
  }
}

function usePasswordFallback() {
  // Парольная Cloudflare-сессия остаётся главным способом восстановления доступа.
  // Удаляем только локальный ключ блокировки этого браузера и просим пароль заново.
  localStorage.removeItem(CREDENTIAL_KEY);
  localStorage.removeItem(USER_KEY);
  credentialId = '';
  location.href = '/auth/logout';
}

function getOrCreateUserId() {
  let value = localStorage.getItem(USER_KEY);
  if (value) return value;
  value = bytesToBase64Url(randomBytes(32));
  localStorage.setItem(USER_KEY, value);
  return value;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}


function setupPrivacyDecoy() {
  realWorkspace = document.querySelector('.workspace');
  const headerActions = document.querySelector('.header-actions');
  headerSubtitle = document.getElementById('month-subtitle');

  if (!realWorkspace || !headerActions || !headerSubtitle) {
    // На случай необычно раннего выполнения модуля.
    setTimeout(setupPrivacyDecoy, 0);
    return;
  }

  if (!document.getElementById('finance-decoy-style')) installDecoyStyles();

  decoyToggle = document.getElementById('finance-decoy-toggle');
  if (!decoyToggle) {
    decoyToggle = document.createElement('button');
    decoyToggle.id = 'finance-decoy-toggle';
    decoyToggle.className = 'icon-button finance-decoy-toggle';
    decoyToggle.type = 'button';
    decoyToggle.addEventListener('click', toggleDecoy);
    headerActions.prepend(decoyToggle);
  }

  decoyWorkspace = document.getElementById('finance-decoy-workspace');
  if (!decoyWorkspace) {
    decoyWorkspace = document.createElement('main');
    decoyWorkspace.id = 'finance-decoy-workspace';
    decoyWorkspace.className = 'workspace finance-decoy-workspace';
    decoyWorkspace.setAttribute('aria-label', 'Расходы');
    realWorkspace.insertAdjacentElement('afterend', decoyWorkspace);
  }

  document.addEventListener('click', guardDecoyInteractions, true);
  document.addEventListener('submit', guardDecoyInteractions, true);
  document.addEventListener('change', handleDecoyMonthChange, true);

  subtitleObserver = new MutationObserver(() => {
    if (!decoyActive || decoyWriteGuard) return;
    const current = headerSubtitle.textContent || '';
    const fake = decoySubtitle();
    if (current !== fake) realHeaderSubtitle = current;
    writeDecoySubtitle();
  });
  subtitleObserver.observe(headerSubtitle, { subtree: true, childList: true, characterData: true });

  const monthTitle = document.getElementById('month-title');
  if (monthTitle) {
    titleObserver = new MutationObserver(() => {
      if (decoyActive) renderDecoyWorkspace();
    });
    titleObserver.observe(monthTitle, { subtree: true, childList: true, characterData: true });
  }

  activateDecoy({ closeTransient: false });
}

function installDecoyStyles() {
  const style = document.createElement('style');
  style.id = 'finance-decoy-style';
  style.textContent = `
    .finance-decoy-workspace[hidden] { display: none !important; }

    #finance-decoy-toggle {
      position: relative;
      flex: 0 0 auto;
    }
    #finance-decoy-toggle.is-real-visible {
      color: var(--text-primary);
      background: var(--accent-soft);
    }
    #finance-decoy-toggle svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
    }

    html.finance-decoy-active #add-expense-btn,
    html.finance-decoy-active #month-more-menu,
    html.finance-decoy-active #new-month-btn,
    html.finance-decoy-active .mobile-add-button {
      display: none !important;
    }

    html.finance-decoy-active .nav-item[data-action],
    html.finance-decoy-active .mobile-nav-item[data-action] {
      opacity: .38;
    }

    html.finance-decoy-active .toast,
    html.finance-decoy-active .drop-overlay {
      display: none !important;
    }

    .finance-decoy-previous { color: var(--text-secondary); }
    .finance-decoy-income-note {
      max-width: 52%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }
    .finance-decoy-progress > span {
      display: block;
      height: 100%;
      background: var(--accent);
      border-radius: inherit;
    }
    .finance-decoy-workspace .filters {
      user-select: none;
    }
    .finance-decoy-workspace .filters input,
    .finance-decoy-workspace .filters select,
    .finance-decoy-workspace .filter-reset {
      pointer-events: none;
    }
    .finance-decoy-workspace .row-actions {
      pointer-events: none;
    }

    @media (max-width: 700px) {
      .finance-decoy-income-note { max-width: 48%; }
      #finance-decoy-toggle {
        width: 42px;
        height: 42px;
      }
    }
  `;
  document.head.append(style);
}

function toggleDecoy(event) {
  event?.preventDefault();
  event?.stopPropagation();
  if (decoyActive) revealRealData();
  else activateDecoy({ closeTransient: true });
}

function activateDecoy({ closeTransient = true } = {}) {
  const wasActive = decoyActive;
  decoyActive = true;

  if (closeTransient) closeRealDataSurfaces();

  if (!realWorkspace || !decoyWorkspace || !headerSubtitle) return;

  const currentSubtitle = headerSubtitle.textContent || '';
  if (!wasActive || currentSubtitle !== decoySubtitle()) {
    realHeaderSubtitle = currentSubtitle || realHeaderSubtitle;
  }
  renderDecoyWorkspace();
  writeDecoySubtitle();

  realWorkspace.hidden = true;
  decoyWorkspace.hidden = false;
  document.documentElement.classList.add('finance-decoy-active');
  updateDecoyToggle();
}

function revealRealData() {
  decoyActive = false;
  if (!realWorkspace || !decoyWorkspace || !headerSubtitle) return;

  decoyWorkspace.hidden = true;
  realWorkspace.hidden = false;
  document.documentElement.classList.remove('finance-decoy-active');

  if (realHeaderSubtitle) {
    decoyWriteGuard = true;
    headerSubtitle.textContent = realHeaderSubtitle;
    decoyWriteGuard = false;
  }

  updateDecoyToggle();
}

function closeRealDataSurfaces() {
  document.querySelectorAll('dialog[open]').forEach((dialog) => {
    try { dialog.close(); } catch {}
  });
  document.querySelectorAll('details[open]').forEach((details) => {
    details.open = false;
  });
}

function guardDecoyInteractions(event) {
  if (!decoyActive) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  // Разрешены только глаз, выбор уже существующего месяца и переключение темы.
  if (target.closest('#finance-decoy-toggle, #month-select, .month-item, #theme-btn')) return;

  const interactive = target.closest('button, a, summary, input, select, textarea, form');
  if (!interactive) return;

  event.preventDefault();
  event.stopImmediatePropagation();
}

function handleDecoyMonthChange(event) {
  if (!decoyActive) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.matches('#month-select')) return;
  setTimeout(() => {
    captureRealSubtitleAfterMonthChange();
    renderDecoyWorkspace();
  }, 0);
}

function captureRealSubtitleAfterMonthChange() {
  if (!decoyActive || !headerSubtitle) return;
  const current = headerSubtitle.textContent || '';
  const fake = decoySubtitle();
  if (current !== fake) realHeaderSubtitle = current;
  writeDecoySubtitle();
}

function writeDecoySubtitle() {
  if (!decoyActive || !headerSubtitle) return;
  const value = decoySubtitle();
  if (headerSubtitle.textContent === value) return;
  decoyWriteGuard = true;
  headerSubtitle.textContent = value;
  decoyWriteGuard = false;
}

function decoySubtitle() {
  return `${DECOY_EXPENSES.length} операции · доход ${formatDecoyMoney(DECOY_INCOME)}`;
}

function updateDecoyToggle() {
  if (!decoyToggle) return;

  if (decoyActive) {
    decoyToggle.classList.remove('is-real-visible');
    decoyToggle.setAttribute('aria-label', 'Показать настоящие данные');
    decoyToggle.title = 'Показать настоящие данные';
    decoyToggle.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18"></path>
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"></path>
        <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5.6 0 9 5.3 9 5.3a14 14 0 0 1-2.2 2.8"></path>
        <path d="M6.2 6.2C4.2 7.6 3 9.3 3 9.3S6.4 14.7 12 14.7c1 0 2-.2 2.8-.5"></path>
      </svg>`;
  } else {
    decoyToggle.classList.add('is-real-visible');
    decoyToggle.setAttribute('aria-label', 'Скрыть настоящие данные');
    decoyToggle.title = 'Скрыть настоящие данные';
    decoyToggle.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12s3.4-5.5 9-5.5S21 12 21 12s-3.4 5.5-9 5.5S3 12 3 12Z"></path>
        <circle cx="12" cy="12" r="2.5"></circle>
      </svg>`;
  }
}

function renderDecoyWorkspace() {
  if (!decoyWorkspace) return;

  const total = DECOY_EXPENSES.reduce((sum, item) => sum + item.amount, 0);
  const balance = DECOY_INCOME - total;
  const spentPercent = DECOY_INCOME > 0 ? Math.min(100, (total / DECOY_INCOME) * 100) : 0;
  const byType = groupDecoy(DECOY_EXPENSES, 'type');
  const byCategory = groupDecoy(DECOY_EXPENSES, 'category');
  const monthAbbr = currentDecoyMonthAbbr();

  decoyWorkspace.innerHTML = `
    <section class="financial-overview" aria-label="Финансовая сводка">
      <div class="balance-block">
        <span class="summary-label">Остаток</span>
        <strong class="balance-value">${escapeDecoy(formatDecoyMoney(balance))}</strong>
        <div class="balance-context">
          <span>из <strong>${escapeDecoy(formatDecoyMoney(DECOY_INCOME))}</strong> дохода</span>
          <span class="context-dot" aria-hidden="true"></span>
          <span class="finance-decoy-previous">как в прошлом месяце</span>
        </div>
        <div class="spend-progress finance-decoy-progress" aria-label="Доля потраченного дохода">
          <span style="width:${spentPercent.toFixed(1)}%"></span>
        </div>
        <div class="progress-caption">
          <span>Потрачено ${Math.round(spentPercent)}%</span>
          <span class="finance-decoy-income-note">${escapeDecoy(DECOY_INCOME_NOTE)}</span>
        </div>
      </div>
      <div class="overview-metrics">
        <div class="metric-item expense-metric">
          <span>Расходы</span>
          <strong>${escapeDecoy(formatDecoyMoney(total))}</strong>
          <small>за выбранный месяц</small>
        </div>
        <div class="metric-rule"></div>
        <div class="metric-item">
          <span>Операции</span>
          <strong>${DECOY_EXPENSES.length}</strong>
          <small>строк расходов</small>
        </div>
      </div>
    </section>

    <section class="insights" aria-label="Структура расходов">
      <article class="insight-section types-section">
        <div class="section-title-row"><div><p class="section-kicker">Структура</p><h2>По типам</h2></div></div>
        <div class="breakdown-list">${renderDecoyBreakdown(byType, total)}</div>
      </article>
      <article class="insight-section categories-section">
        <div class="section-title-row"><div><p class="section-kicker">Основные траты</p><h2>По категориям</h2></div></div>
        <div class="breakdown-list">${renderDecoyBreakdown(byCategory, total)}</div>
      </article>
    </section>

    <section class="expenses-section">
      <div class="section-head">
        <div>
          <p class="section-kicker">История</p>
          <div class="expenses-title-line"><h2>Расходы</h2><span class="section-meta">${DECOY_EXPENSES.length} · ${escapeDecoy(formatDecoyMoney(total))}</span></div>
        </div>
      </div>
      <div class="filters" aria-label="Фильтры">
        <label class="search-field">
          <span class="visually-hidden">Поиск</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
          <input type="search" placeholder="Поиск расходов…" tabindex="-1">
        </label>
        <label class="compact-select"><span class="visually-hidden">Категория</span><select tabindex="-1"><option>Все категории</option></select></label>
        <label class="compact-select"><span class="visually-hidden">Тип</span><select tabindex="-1"><option>Все типы</option></select></label>
        <label class="compact-select sort-select"><span class="visually-hidden">Сортировка</span><select tabindex="-1"><option>Сначала ранние</option></select></label>
        <button class="filter-reset" type="button" tabindex="-1">Сбросить</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th class="day-col">День</th><th>Категория</th><th>Описание</th><th class="money">Сумма</th><th>Тип</th><th class="actions-col"><span class="visually-hidden">Действия</span></th></tr></thead>
          <tbody>${DECOY_EXPENSES.map((item) => renderDecoyExpenseRow(item, monthAbbr)).join('')}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderDecoyBreakdown(items, total) {
  return items.map((item, index) => {
    const percent = total > 0 ? (item.amount / total) * 100 : 0;
    const color = decoyColor(item.name, index);
    return `
      <div class="breakdown-row" style="--item-color:${color}">
        <div class="breakdown-name"><span class="category-dot"></span><span>${escapeDecoy(item.name)}</span></div>
        <div class="bar"><i style="width:${percent.toFixed(1)}%"></i></div>
        <strong>${escapeDecoy(formatDecoyMoney(item.amount))}</strong>
      </div>`;
  }).join('');
}

function renderDecoyExpenseRow(item, monthAbbr) {
  const color = decoyColor(item.category);
  return `
    <tr>
      <td class="day-cell"><span class="day-number">${item.day}</span><span class="day-month">${escapeDecoy(monthAbbr)}</span></td>
      <td class="category-cell"><span class="category-mark" style="--item-color:${color}"><span class="category-dot"></span><span>${escapeDecoy(item.category)}</span></span></td>
      <td class="expense-description-cell">${escapeDecoy(item.description)}</td>
      <td class="money">${escapeDecoy(formatDecoyMoney(item.amount))}</td>
      <td><span class="type-text">${escapeDecoy(item.type)}</span></td>
      <td class="row-actions"></td>
    </tr>`;
}

function groupDecoy(items, key) {
  const totals = new Map();
  for (const item of items) totals.set(item[key], (totals.get(item[key]) || 0) + item.amount);
  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ru'));
}

function formatDecoyMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function currentDecoyMonthAbbr() {
  const select = document.getElementById('month-select');
  const match = String(select?.value || '').match(/-(\d{2})$/);
  if (match) {
    const index = Number(match[1]) - 1;
    if (DECOY_MONTH_ABBRS[index]) return DECOY_MONTH_ABBRS[index];
  }

  const title = (document.getElementById('month-title')?.textContent || '').toLocaleLowerCase('ru');
  const names = ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
  const index = names.findIndex((name) => title.includes(name));
  return index >= 0 ? DECOY_MONTH_ABBRS[index] : 'мес';
}

function decoyColor(value, salt = 0) {
  const palette = ['#74866a', '#b17254', '#7c79a8', '#b89448', '#5f8f91', '#9b6c82', '#6f86a7', '#87935d', '#a36f56', '#777d72'];
  let hash = salt;
  for (const char of String(value || '')) hash = ((hash * 31) + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function escapeDecoy(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isUserCancel(error) {
  return error?.name === 'NotAllowedError' || error?.name === 'AbortError';
}
